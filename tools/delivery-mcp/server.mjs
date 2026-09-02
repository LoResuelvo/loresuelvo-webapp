import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { captureGitSnapshot } from "./lib/git-snapshot.mjs";
import { selectGate } from "./lib/select-gate.mjs";
import { runMaintainabilityAudit } from "./lib/run-maintainability.mjs";
import { formatInspectionResult } from "./lib/format-result.mjs";

const DeliveryInspectInputSchema = z.object({
  intent: z
    .enum(["prepare_commit", "close_scenario", "close_batch", "close_us"])
    .default("prepare_commit"),
  proposedCommitMessage: z.string().optional(),
  featureFile: z.string().optional(),
  scenarioName: z.string().optional(),
});

const server = new Server(
  {
    name: "loresuelvo-delivery",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "delivery_inspect",
        description:
          "Inspects staged changes, infers US, selects applicable delivery gate, and executes maintainability audit.",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["prepare_commit", "close_scenario", "close_batch", "close_us"],
              description: "Delivery intent for this inspection step",
            },
            proposedCommitMessage: {
              type: "string",
              description: "Optional commit message proposed by agent",
            },
            featureFile: {
              type: "string",
              description: "Optional path to the relevant feature file",
            },
            scenarioName: {
              type: "string",
              description: "Optional scenario name under inspection",
            },
          },
          required: ["intent"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "delivery_inspect") {
    throw new Error(`Unknown tool requested: ${request.params.name}`);
  }

  const repoRoot = process.cwd();

  try {
    const parseResult = DeliveryInspectInputSchema.safeParse(request.params.arguments || {});
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                schemaVersion: 1,
                status: "blocked",
                snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                repository: { branch: "UNKNOWN", headSha: "UNKNOWN", usId: null },
                gate: { id: "NONE", reasonCodes: ["INVALID_ARGUMENTS"], checks: [] },
                maintainability: { status: "not_applicable", filesReviewed: [], signalCount: 0, signals: [] },
                diagnostics: [
                  {
                    code: "INVALID_ARGUMENTS",
                    message: errorMsg,
                    retryable: false,
                  },
                ],
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const { intent, proposedCommitMessage, featureFile, scenarioName } = parseResult.data;

    // 1. Git snapshot
    const snapshot = await captureGitSnapshot({
      cwd: repoRoot,
      proposedCommitMessage: proposedCommitMessage || "",
    });

    // 2. Maintainability audit
    const maintainability = await runMaintainabilityAudit({
      stagedFiles: snapshot.stagedFiles,
      repoRoot,
    });

    // 3. Gate selection
    const gateResult = selectGate({
      intent,
      proposedCommitMessage: proposedCommitMessage || "",
      featureFile: featureFile || "",
      scenarioName: scenarioName || "",
      snapshot,
      maintainability,
    });

    // 4. Format canonical output
    const inspectionResult = formatInspectionResult({
      snapshot,
      gateResult,
      maintainability,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(inspectionResult, null, 2),
        },
      ],
    };
  } catch (error) {
    const safeMessage = String(error.message || "An unexpected error occurred").split("\n")[0];
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              schemaVersion: 1,
              status: "blocked",
              snapshotHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              repository: { branch: "UNKNOWN", headSha: "UNKNOWN", usId: null },
              gate: { id: "NONE", reasonCodes: ["INTERNAL_ERROR"], checks: [] },
              maintainability: { status: "not_applicable", filesReviewed: [], signalCount: 0, signals: [] },
              diagnostics: [
                {
                  code: "INTERNAL_ERROR",
                  message: safeMessage,
                  retryable: false,
                },
              ],
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((error) => {
  console.error(`Fatal server error: ${error.message}`);
  process.exit(1);
});
