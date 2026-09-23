import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";
import { inspectDelivery } from "./lib/inspect-delivery.mjs";
import { prepareDelivery } from "./lib/prepare-delivery.mjs";
import { formatInputIssues } from "./lib/input-schema.mjs";
import { inspectCi } from "./lib/ci-provider.mjs";
import { finalizeDelivery, verifyHeadDelivery } from "./lib/delivery-finalize.mjs";
import { testDelivery } from "./lib/test-delivery.mjs";
import { redactSecrets } from "./lib/redact-secrets.mjs";
import { waitForJob, cancelDeliveryJob, cleanupOrphanedDeliveryJobs } from "./lib/jobs.mjs";
import { findRepoRoot } from "./lib/repo-root.mjs";
import { abandonRepairAttempt } from "./lib/delivery-ledger.mjs";
import { operationCatalog, operationForName, operationResponse } from "./lib/operation-contracts.mjs";

export const server = new Server(
  { name: "loresuelvo-delivery", version: "1.4.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: operationCatalog() }));

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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const toolResponse = (result, isError = false) => {
    const payload = operationForName(name) ? operationResponse(name, result) : result;
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      ...(operationForName(name) && { structuredContent: payload }),
      isError,
    };
  };

  if (name === "delivery_job_wait") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        {
          status: "blocked",
          code: "INVALID_ARGUMENTS",
          message: formatInputIssues(parsed.error),
        },
        true
      );
    }
    try {
      const result = await waitForJob(parsed.data);
      const isError = ["failed", "timed_out", "cancelled"].includes(result.status);
      return toolResponse(result, isError);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Job wait error")).split("\n")[0];
      return toolResponse({ status: "blocked", code: "INTERNAL_ERROR", message }, true);
    }
  }

  if (name === "delivery_job_cancel") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        {
          status: "blocked",
          code: "INVALID_ARGUMENTS",
          message: formatInputIssues(parsed.error),
        },
        true
      );
    }
    try {
      const result = await cancelDeliveryJob(parsed.data);
      return toolResponse(result, result.status === "cancelled" && result.error?.code !== "JOB_CANCELLED");
    } catch (error) {
      const message = redactSecrets(String(error.message || "Job cancellation error")).split("\n")[0];
      return toolResponse({ status: "blocked", code: "INTERNAL_ERROR", message }, true);
    }
  }

  if (name === "delivery_finalize") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        finalizationError("INVALID_ARGUMENTS", formatInputIssues(parsed.error)),
        true
      );
    }
    try {
      const result = await finalizeDelivery(parsed.data);
      const isError = !result.finalized && result.status !== "job_started" && result.status !== "running";
      return toolResponse(result, isError);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Delivery finalization error")).split(
        "\n"
      )[0];
      return toolResponse(finalizationError("INTERNAL_ERROR", message), true);
    }
  }

  if (name === "delivery_verify_head") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        {
          verified: false,
          status: "blocked",
          reason: "INVALID_ARGUMENTS",
          message: formatInputIssues(parsed.error),
        },
        true
      );
    }
    try {
      const result = await verifyHeadDelivery(parsed.data);
      const isError = !result.verified && !["job_started", "running"].includes(result.status);
      return toolResponse(result, isError);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Delivery verify head error")).split(
        "\n"
      )[0];
      return toolResponse(
        {
          verified: false,
          status: "blocked",
          reason: "INTERNAL_ERROR",
          message,
        },
        true
      );
    }
  }

  if (name === "delivery_ci_inspect") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
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

  if (name === "delivery_repair_abandon") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        {
          abandoned: false,
          status: "blocked",
          reason: "INVALID_ARGUMENTS",
          message: formatInputIssues(parsed.error),
        },
        true
      );
    }
    try {
      const result = await abandonRepairAttempt(parsed.data);
      return toolResponse(result, !result.abandoned);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Repair recovery error")).split("\n")[0];
      return toolResponse(
        {
          abandoned: false,
          status: "blocked",
          reason: "INTERNAL_ERROR",
          message,
        },
        true
      );
    }
  }

  if (name === "delivery_test") {
    const parsed = operationForName(name).input.safeParse(request.params.arguments || {});
    if (!parsed.success) {
      return toolResponse(
        {
          status: "error",
          mode: request.params.arguments?.mode || "affected",
          cached: false,
          durationMs: 0,
          counts: { passed: 0, failed: 0, skipped: 0 },
          diagnostics: [
            {
              code: "INVALID_ARGUMENTS",
              message: formatInputIssues(parsed.error),
              retryable: false,
            },
          ],
        },
        true
      );
    }
    try {
      const result = await testDelivery(parsed.data);
      const isError = result.status === "error" || result.status === "failed";
      return toolResponse(result, isError);
    } catch (error) {
      const message = redactSecrets(String(error.message || "Delivery test error")).split("\n")[0];
      return toolResponse(
        {
          status: "error",
          mode: parsed.data.mode || "affected",
          cached: false,
          durationMs: 0,
          counts: { passed: 0, failed: 0, skipped: 0 },
          diagnostics: [
            {
              code: "INTERNAL_ERROR",
              message,
              retryable: false,
            },
          ],
        },
        true
      );
    }
  }

  const isPrepare = name === "delivery_prepare";
  if (!isPrepare && name !== "delivery_inspect") {
    return toolResponse(inspectionError("UNKNOWN_TOOL", `Unknown tool requested: ${name}`), true);
  }

  const schema = operationForName(name).input;
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
      ? await prepareDelivery({
          ...parsed.data,
          mode: parsed.data.mode,
        })
      : (await inspectDelivery(parsed.data)).result;
    const failed =
      isPrepare && !["passed", "no_changes", "job_started", "running"].includes(result.status);
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
  await cleanupOrphanedDeliveryJobs({ repoRoot: findRepoRoot(process.cwd()), limit: 100 });
  await server.connect(new StdioServerTransport());
}

const invokedAsEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsEntryPoint) {
  run().catch((error) => {
    console.error(`Fatal server error: ${String(error.message || "unknown").split("\n")[0]}`);
    process.exit(1);
  });
}
