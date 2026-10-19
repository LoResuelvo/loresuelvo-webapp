import type { ClaimReference } from "@/domain/claim/types";
import type { JobRequestRepository } from "@/ports/messaging/job-request-repository";
import type { ServiceProposalRepository } from "@/ports/messaging/service-proposal-repository";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";
export async function getClaimReferences(requests: JobRequestRepository, proposals: ServiceProposalRepository, context?: {workOrderId:number;orders:WorkOrderRepository}) {
  const [pendingRequests, ownProposals] = await Promise.all([requests.list(), proposals.getAll()]);
  const items: Array<{reference: ClaimReference; title: string}> = pendingRequests.map(request => ({
    reference: {kind:"job_request",id:request.id}, title:request.title,
  }));
  const result = [...items,...ownProposals.map(proposal => ({
    reference: {kind:"service_proposal" as const,id:proposal.id}, title:String(proposal.id),
  }))];
  if (context) {
    const order = await context.orders.getById(context.workOrderId);
    if (order) result.push({reference:{kind:"work_order",id:order.id},title:String(order.id)});
  }
  return result;
}
