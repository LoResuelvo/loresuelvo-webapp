import type {
  WorkOrderReviewReportReceipt,
} from "@/domain/work-order/types";
import {
  validateWorkOrderReviewReportInput,
  WorkOrderReviewReportValidationException,
} from "@/domain/work-order/review-report-validation";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

export async function reportWorkOrderReview(
  repository: WorkOrderRepository,
  workOrderId: number,
  input: unknown
): Promise<WorkOrderReviewReportReceipt> {
  const validation = validateWorkOrderReviewReportInput(input);
  if (!validation.valid) {
    throw new WorkOrderReviewReportValidationException(validation.error);
  }

  return repository.reportReview(workOrderId, validation.input);
}
