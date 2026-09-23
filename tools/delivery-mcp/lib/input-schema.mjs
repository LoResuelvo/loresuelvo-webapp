import { z } from "zod";

// Compatibility imports for existing core and adapters. The operation schemas
// themselves are owned by operation-contracts.mjs.
export {
  DeliveryInspectInputSchema,
  DeliveryPrepareInputSchema,
  DeliveryCiInputSchema,
  DeliveryRepairAbandonInputSchema,
  DeliveryFinalizeInputSchema,
  DeliveryJobWaitInputSchema,
  DeliveryJobCancelInputSchema,
  DeliveryVerifyHeadInputSchema,
  DeliveryTestInputSchema,
} from "./operation-contracts.mjs";

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
}).strict();

export function formatInputIssues(error) {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join(", ");
}
