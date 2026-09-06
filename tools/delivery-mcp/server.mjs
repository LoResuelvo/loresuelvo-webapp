import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";
import { inspectDelivery } from "./lib/inspect-delivery.mjs";
import { prepareDelivery } from "./lib/prepare-delivery.mjs";
import {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
  DeliveryCiInputSchema,
  DeliveryFinalizeInputSchema,
  formatInputIssues,
} from "./lib/input-schema.mjs";
import { inspectCi } from "./lib/ci-provider.mjs";
import { finalizeDelivery } from "./lib/delivery-finalize.mjs";
import { redactSecrets } from "./lib/redact-secrets.mjs";

const intentProperty = {
  type: "string",
  enum: ["prepare_commit", "close_scenario", "close_batch", "close_us", "repair_ci"],
  description: "Delivery intent for this boundary",
};

const commonProperties = {
  intent: intentProperty,
  proposedCommitMessage: {
    type: "string",
    description: "Optional commit message proposed by the agent",
  },
  featureFile: {
    type: "string",
    description: "Feature path required for Gate B when it cannot be inferred",
  },
  scenarioName: {
    type: "string",
    description: "Optional scenario name recorded as delivery context",
  },
  scopeFiles: {
    type: "array",
    items: { type: "string" },
    description: "Completed feature paths that define Gate D @wip scope",
  },
  repairsSha: {
    type: "string",
    description: "Optional failed commit SHA being repaired by repair_ci",
  },
};

export const server = new Server(
  { name: "loresuelvo-delivery", version: "1.3.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "delivery_inspect",
      description:
        "Inspects staged changes, recent US commits, and maintainability; deterministically selects the applicable gate without running it.",
      inputSchema: {
        type: "object",
        properties: commonProperties,
        required: ["intent"],
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    {
      name: "delivery_prepare",
      description:
        "Inspects the staged snapshot, executes its deterministic local gate, and returns compact cached evidence. It never commits or pushes.",
      inputSchema: {
        type: "object",
        properties: {
          ...commonProperties,
          acknowledgement: {
            type: "object",
            properties: {
              snapshotHash: { type: "string" },
              reason: { type: "string" },
              decisions: {
                type: "object",
                description: "Map of signalId -> justification (min 12 chars each)",
              },
            },
            required: ["snapshotHash"],
          },
          force: {
            type: "boolean",
            description: "Re-run checks instead of reusing cached evidence",
          },
        },
        required: ["intent"],
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    {
      name: "delivery_ci_inspect",
      description: "Inspects GitHub Actions CI status for a given commit SHA",
      inputSchema: {
        type: "object",
        properties: {
          sha: {
            type: "string",
            description: "Commit SHA to inspect CI status for",
          },
        },
        required: ["sha"],
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    {
      name: "delivery_finalize",
      description:
        "Closes a batch or User Story with exact Gate D evidence on HEAD, no @wip in scope, pushed commits, and valid ledger entries. A batch may close with CI pending; a User Story requires green CI for every relevant commit.",
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["close_us", "close_batch"],
            description: "Delivery boundary to finalize; defaults to close_us",
          },
          usId: {
            type: "string",
            description: "Optional User Story identifier used to find its commits",
          },
          scopeFiles: {
            type: "array",
            items: { type: "string" },
            description: "Feature files whose completed scope must match Gate D evidence",
          },
        },
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
  ],
}));

function inspectionError(code, message) {
  return {
    schemaVersion: 1,
    status: "blocked",
    snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    repository: { branch: "UNKNOWN", headSha: "UNKNOWN", usId: null },
    policy: { version: 1, hash: "UNKNOWN" },
    gate: {
      id: "NONE",
      reasonCodes: [code],
      checkIds: [],
      checks: [],
      parameters: {},
      postPushChecks: [],
    },
    maintainability: {
      status: "not_applicable",
      filesReviewed: [],
      signalCount: 0,
      signals: [],
      truncated: false,
    },
    diagnostics: [{ code, message, retryable: false }],
  };
}

function executionError(code, message) {
  return {
    schemaVersion: 1,
    status: "blocked",
    snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    runKey: null,
    cached: false,
    policy: { version: 1, hash: "UNKNOWN" },
    gate: {
      id: "NONE",
      reasonCodes: [code],
      checkIds: [],
      parameters: {},
      postPushChecks: [],
    },
    summary: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
    checks: [],
    diagnostics: [{ code, message, retryable: false }],
    evidence: { recordPath: null },
  };
}

function finalizationError(reason, message) {
  return {
    finalized: false,
    status: "blocked",
    reason,
    message,
  };
}

function toolResponse(result, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;

  if (name === "delivery_finalize") {
    const parsed = DeliveryFinalizeInputSchema.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        finalizationError("INVALID_ARGUMENTS", formatInputIssues(parsed.error)),
        true
      );
    }
    try {
      const result = await finalizeDelivery(parsed.data);
      return toolResponse(result, !result.finalized);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Delivery finalization error")).split(
        "\n"
      )[0];
      return toolResponse(finalizationError("INTERNAL_ERROR", message), true);
    }
  }

  if (name === "delivery_ci_inspect") {
    const parsed = DeliveryCiInputSchema.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse({ error: formatInputIssues(parsed.error) }, true);
    }
    try {
      const result = await inspectCi({ sha: parsed.data.sha });
      const failed = ["failed", "timed_out", "provider_error"].includes(result.status);
      return toolResponse(result, failed);
    } catch (error) {
      const message = redactSecrets(String(error.message || "CI inspection error")).split("\n")[0];
      return toolResponse({ error: message }, true);
    }
  }

  const isPrepare = name === "delivery_prepare";
  if (!isPrepare && name !== "delivery_inspect") {
    return toolResponse(inspectionError("UNKNOWN_TOOL", `Unknown tool requested: ${name}`), true);
  }

  const schema = isPrepare ? DeliveryPrepareInputSchema : DeliveryInspectInputSchema;
  const parsed = schema.safeParse(request.params.arguments || {});
  if (!parsed.success) {
    const result = (isPrepare ? executionError : inspectionError)(
      "INVALID_ARGUMENTS",
      formatInputIssues(parsed.error)
    );
    return toolResponse(result, true);
  }

  try {
    const result = isPrepare
      ? await prepareDelivery(parsed.data)
      : (await inspectDelivery(parsed.data)).result;
    const failed = isPrepare && !["passed", "no_changes"].includes(result.status);
    return toolResponse(result, failed);
  } catch (error) {
    const message = redactSecrets(String(error.message || "Unexpected delivery error")).split("\n")[0];
    return toolResponse(
      (isPrepare ? executionError : inspectionError)("INTERNAL_ERROR", message),
      true
    );
  }
});

async function run() {
  await server.connect(new StdioServerTransport());
}

const invokedAsEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsEntryPoint) {
  run().catch((error) => {
    console.error(`Fatal server error: ${String(error.message || "unknown").split("\n")[0]}`);
    process.exit(1);
  });
}
