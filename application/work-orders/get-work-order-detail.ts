import type { WorkOrderDetail } from "@/domain/work-order/types";
import type { WorkOrderRepository } from "@/ports/work-order-repository";

export async function getWorkOrderDetail(
  repository: WorkOrderRepository,
  workOrderId: number
): Promise<WorkOrderDetail> {
  return repository.getDetail(workOrderId);
}
