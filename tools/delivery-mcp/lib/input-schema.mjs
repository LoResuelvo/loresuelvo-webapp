import { z } from "zod";

export const DeliveryInspectInputSchema = z.object({
  intent: z
    .enum(["prepare_commit", "close_scenario", "close_batch", "close_us", "repair_ci"])
    .default("prepare_commit"),
  proposedCommitMessage: z.string().max(500).optional(),
  featureFile: z.string().max(500).optional(),
  scenarioName: z.string().max(500).optional(),
  scopeFiles: z.array(z.string().max(500)).max(100).default([]),
  repairsSha: z.string().min(7).max(40).optional(),
});

export const DeliveryPrepareInputSchema = DeliveryInspectInputSchema.extend({
  force: z.boolean().default(false),
  acknowledgement: z
    .object({
      snapshotHash: z.string().length(64),
      reason: z.string().max(1000).optional(),
      decisions: z
        .union([
          z.record(z.string(), z.string()),
          z.array(
            z.object({
              id: z.string().optional(),
              signalId: z.string().optional(),
              reason: z.string().optional(),
              justification: z.string().optional(),
            })
          ),
        ])
        .optional(),
    })
    .optional(),
});

export const DeliveryContextInputSchema = z.object({
  action: z.enum(["set", "inspect", "clear", "consume"]).default("set"),
  intent: z
    .enum(["prepare_commit", "close_scenario", "close_batch", "close_us", "repair_ci"])
    .optional(),
  usId: z.string().max(500).optional(),
  featureFile: z.string().max(500).optional(),
  scenarioName: z.string().max(500).optional(),
  scopeFiles: z.array(z.string().max(500)).max(100).default([]),
  repairsSha: z.string().min(7).max(40).optional(),
});

export const DeliveryCiInputSchema = z.object({
  sha: z.string().min(7).max(40),
});

export const DeliveryFinalizeInputSchema = z.object({
  intent: z.enum(["close_us", "close_batch"]).default("close_us"),
  usId: z.string().max(500).optional(),
  scopeFiles: z.array(z.string().max(500)).default([]),
  repairsSha: z.string().min(7).max(40).optional(),
});

export const DeliveryVerifyHeadInputSchema = z.object({
  intent: z.enum(["close_us", "close_batch"]).default("close_us"),
  usId: z.string().max(500).optional(),
  scopeFiles: z.array(z.string().max(500)).default([]),
});

export function formatInputIssues(error) {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join(", ");
}
