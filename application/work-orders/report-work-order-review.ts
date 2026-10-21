import type {
  WorkOrderReviewReportInput,
  WorkOrderReviewReportReceipt,
} from "@/domain/work-order/types";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

export async function reportWorkOrderReview(
  repository: WorkOrderRepository,
  workOrderId: number,
  input: WorkOrderReviewReportInput
): Promise<WorkOrderReviewReportReceipt> {
  return repository.reportReview(workOrderId, input);
}
