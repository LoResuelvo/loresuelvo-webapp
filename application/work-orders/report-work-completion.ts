import type { CompletionReport } from "@/domain/work-order/types";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

export async function reportWorkCompletion(
  repository: WorkOrderRepository,
  workOrderId: number,
  description: string,
  imageFileIds: string[]
): Promise<CompletionReport> {
  return repository.reportCompletion(workOrderId, {
    description,
    imageFileIds,
  });
}
