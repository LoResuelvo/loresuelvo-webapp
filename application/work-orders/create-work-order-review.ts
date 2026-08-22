import type { WorkOrderReview, WorkOrderReviewInput } from "@/domain/work-order/types";
import type { WorkOrderRepository } from "@/ports/work-order-repository";
import { validateReviewInput } from "@/domain/work-order/WorkOrderReview";

export async function createWorkOrderReview(
  repository: WorkOrderRepository,
  workOrderId: number,
  input: WorkOrderReviewInput
): Promise<WorkOrderReview> {
  const validation = validateReviewInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }

  return repository.createReview(workOrderId, input);
}
