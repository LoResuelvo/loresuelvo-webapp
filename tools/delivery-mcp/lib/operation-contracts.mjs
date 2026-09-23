import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const scopeFiles = z.array(z.string().max(500)).max(100).default([]);
const executionMode = z.enum(["sync", "job", "auto"]).optional();

function withExecutionMode(schema, field, defaultMode) {
  return schema.strict().superRefine((input, context) => {
    if (input.async === true && input[field] && input[field] !== "job" && input[field] !== "auto") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Conflicts with async: true" });
    }
  }).transform((input) => ({
    ...input,
    [field]: input.async === true ? "job" : input[field] ?? defaultMode,
  }));
}

export const DeliveryInspectInputSchema = z.object({
  intent: z
    .enum(["prepare_commit", "close_scenario", "close_batch", "close_us", "repair_ci"])
    .default("prepare_commit"),
  proposedCommitMessage: z.string().max(500).optional(),
  featureFile: z.string().max(500).optional(),
  scenarioName: z.string().max(500).optional(),
  scopeFiles,
  repairsSha: z.string().min(7).max(40).optional(),
}).strict();

export const DeliveryPrepareInputSchema = withExecutionMode(DeliveryInspectInputSchema.extend({
  force: z.boolean().default(false),
  mode: executionMode,
  async: z.boolean().optional(),
  acknowledgement: z
    .object({
      snapshotHash: z.string().length(64),
      reason: z.string().max(1000).optional(),
      decisions: z
        .union([
          z.record(z.string(), z.string().min(12)),
          z.array(
            z.object({
              id: z.string().optional(),
              signalId: z.string().optional(),
              reason: z.string().optional(),
              justification: z.string().optional(),
            }).strict()
          ),
        ])
        .optional(),
    }).strict()
    .optional(),
}), "mode", "auto");

export const DeliveryCiInputSchema = z.object({
  sha: z.string().min(7).max(40),
}).strict();

export const DeliveryRepairAbandonInputSchema = z.object({
  repairSha: z
    .string()
    .length(40)
    .regex(/^[a-f0-9]{40}$/i, "repairSha must be a full commit SHA"),
  targetSha: z
    .string()
    .length(40)
    .regex(/^[a-f0-9]{40}$/i, "targetSha must be a full commit SHA"),
  reason: z.string().min(12).max(500),
}).strict();

export const DeliveryFinalizeInputSchema = withExecutionMode(z.object({
  intent: z.enum(["close_us", "close_batch"]).default("close_us"),
  usId: z.string().max(500).optional(),
  scopeFiles,
  repairsSha: z.string().min(7).max(40).optional(),
  waitForCi: z.boolean().default(false),
  timeoutMs: z.number().int().min(100).max(1800000).default(900000),
  pollIntervalMs: z.number().int().min(50).max(60000).default(10000),
  mode: executionMode,
  async: z.boolean().optional(),
}), "mode", "auto");

export const DeliveryJobWaitInputSchema = z.object({
  jobId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid job identifier"),
  timeoutMs: z.number().int().min(100).max(180000).default(60000),
}).strict();

export const DeliveryJobCancelInputSchema = z.object({
  jobId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid job identifier"),
  reason: z.string().max(500).optional(),
}).strict();

export const DeliveryVerifyHeadInputSchema = withExecutionMode(z.object({
  intent: z.enum(["close_us", "close_batch"]).default("close_us"),
  usId: z.string().max(500).optional(),
  scopeFiles,
  force: z.boolean().default(false),
  mode: executionMode,
  async: z.boolean().optional(),
}), "mode", "sync");

export const DeliveryTestInputSchema = withExecutionMode(z.object({
  mode: z.enum(["affected", "unit", "scenario", "diagnostic"]).default("affected"),
  // `mode` selects the functional test operation. Keep job execution as a
  // separate field so callers can request a recoverable worker without
  // colliding with the existing affected/unit/scenario/diagnostic contract.
  executionMode,
  async: z.boolean().optional(),
  // Keep focused-test input bounded so an accidental request cannot expand
  // into an unreviewable command line/context payload.
  testFiles: z.array(z.string().max(500)).max(20).optional(),
  featureFile: z.string().max(500).optional(),
  scenarioName: z.string().max(500).optional(),
  checkId: z.string().max(100).optional(),
  force: z.boolean().default(false),
}), "executionMode", "auto");

// The input schemas own validation and defaults. This registry owns operation
// identity, presentation, CLI mapping and the common response boundary.
export const OPERATION_CONTRACTS = Object.freeze([
  { name: "delivery_inspect", input: DeliveryInspectInputSchema, cli: "inspect", subject: "staged", description: "Inspect staged changes and select a gate without running it.", readOnly: true },
  { name: "delivery_prepare", input: DeliveryPrepareInputSchema, cli: "prepare", subject: "staged", description: "Execute the selected local gate for the staged snapshot; never commit or push." },
  { name: "delivery_ci_inspect", input: DeliveryCiInputSchema, cli: "ci", subject: "head", description: "Inspect required GitHub Actions evidence for a commit SHA.", readOnly: true, openWorld: true },
  { name: "delivery_repair_abandon", input: DeliveryRepairAbandonInputSchema, subject: "head", description: "Abandon one unpublished Gate R repair attempt with durable audit evidence.", destructive: true, idempotent: false },
  { name: "delivery_finalize", input: DeliveryFinalizeInputSchema, cli: "finalize", subject: "head", description: "Close a batch or US against Gate D, ledger and CI evidence.", openWorld: true },
  { name: "delivery_job_wait", input: DeliveryJobWaitInputSchema, subject: "job", description: "Wait for a recoverable delivery job within a bounded timeout." },
  { name: "delivery_job_cancel", input: DeliveryJobCancelInputSchema, subject: "job", description: "Cancel an owned delivery job and its process group.", destructive: true },
  { name: "delivery_verify_head", input: DeliveryVerifyHeadInputSchema, cli: "verify-head", subject: "head", description: "Run Gate D on HEAD and record evidence without another commit." },
  { name: "delivery_test", input: DeliveryTestInputSchema, cli: "test", subject: "working_tree", description: "Run focused TDD validation on the working tree without a commit receipt." },
]);

const byName = new Map(OPERATION_CONTRACTS.map((operation) => [operation.name, operation]));
const byCli = new Map(OPERATION_CONTRACTS.filter((operation) => operation.cli).map((operation) => [operation.cli, operation]));

export function operationForName(name) { return byName.get(name); }
export function operationForCli(command) { return byCli.get(command); }

const OutputEnvelopeSchema = z.object({
  envelopeVersion: z.literal(1),
  operation: z.string(),
  status: z.string(),
  subject: z.object({
    kind: z.enum(["working_tree", "staged", "head", "job"]),
    headSha: z.string().optional(),
    snapshotHash: z.string().optional(),
    sha: z.string().optional(),
    jobId: z.string().optional(),
  }),
  diagnostics: z.array(z.unknown()),
  nextAction: z.string(),
  job: z.record(z.unknown()).optional(),
  result: z.record(z.unknown()).nullable(),
  evidence: z.unknown().optional(),
}).passthrough();

function jsonSchema(schema) {
  const { $schema, ...materialized } = zodToJsonSchema(schema, { $refStrategy: "none" });
  return materialized;
}

export function operationCatalog() {
  const outputSchema = jsonSchema(OutputEnvelopeSchema);
  return OPERATION_CONTRACTS.map(({ name, input, description, readOnly, destructive, idempotent, openWorld }) => ({
    name,
    description,
    inputSchema: jsonSchema(input),
    outputSchema,
    annotations: {
      readOnlyHint: readOnly ?? false,
      destructiveHint: destructive ?? false,
      idempotentHint: idempotent ?? true,
      openWorldHint: openWorld ?? false,
    },
  }));
}

function diagnosticsFor(raw) {
  if (Array.isArray(raw.diagnostics)) return raw.diagnostics;
  const error = raw.error;
  const code = raw.code ?? raw.reason ?? (error && "INTERNAL_ERROR");
  if (!code) return [];
  const message = raw.message ?? (typeof error === "string" ? error : error?.message) ?? String(code);
  return [{ code: String(code), message: String(message), retryable: false }];
}

function nextActionFor(operation, raw) {
  if (["job_started", "running", "queued", "in_progress"].includes(raw.status)) return "wait_for_job";
  if (raw.status === "review_required") return "review_and_acknowledge";
  if (raw.status === "ready" && operation === "delivery_inspect") return "prepare";
  if (raw.status === "passed" && operation === "delivery_prepare" && raw.evidence?.recordPath) return "commit";
  if (raw.status === "passed" || raw.status === "no_changes") return "none";
  return "inspect_diagnostics";
}

export function operationResponse(name, raw) {
  const contract = operationForName(name);
  if (!contract) throw new Error(`Unknown delivery operation: ${name}`);
  const result = raw && typeof raw === "object" ? raw : { status: "blocked", error: "Missing operation result" };
  const subject = {
    kind: contract.subject,
    ...(result.repository?.headSha && { headSha: result.repository.headSha }),
    ...(result.headSha && { headSha: result.headSha }),
    ...(result.snapshotHash && { snapshotHash: result.snapshotHash }),
    ...(result.sha && { sha: result.sha }),
    ...(result.jobId && { jobId: result.jobId }),
  };
  const envelope = {
    ...result, // Transitional flat fields for existing CLI/MCP consumers.
    envelopeVersion: 1,
    operation: name,
    status: result.status ?? "blocked",
    subject,
    diagnostics: diagnosticsFor(result),
    nextAction: nextActionFor(name, result),
    result: Object.hasOwn(result, "result") ? result.result : result,
    ...(result.jobId && { job: { jobId: result.jobId, status: result.status } }),
    ...(result.evidence && { evidence: result.evidence }),
  };
  return OutputEnvelopeSchema.parse(envelope);
}

export function renderOperationDocs() {
  const rows = OPERATION_CONTRACTS.map(({ name, cli, subject, description }) =>
    `| \`${name}\` | ${cli ? `\`${cli}\`` : "—"} | \`${subject}\` | ${description} |`
  );
  return [
    "| MCP | CLI | Sujeto | Contrato |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}
