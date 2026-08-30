import type { WorkOrder } from "@/domain/work-order/types";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

export async function getWorkOrderByProposal(
  repository: WorkOrderRepository,
  serviceProposalId: number
): Promise<WorkOrder | null> {
  return repository.getByServiceProposalId(serviceProposalId);
}
