import type { ClaimReference, ClaimReferenceContext } from "@/domain/claim/types";
import type { JobRequestRepository } from "@/ports/messaging/job-request-repository";
import type { ServiceProposalRepository } from "@/ports/messaging/service-proposal-repository";
import type { WorkOrderRepository } from "@/ports/work-orders/work-order-repository";

export interface ClaimReferenceDetails {
  readonly reference: ClaimReference;
  readonly context: ClaimReferenceContext;
}

function getPersonName(person: { name: string; surname: string }): string | undefined {
  const fullName = [person.name, person.surname]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || undefined;
}

export async function getClaimReferences(
  requests: JobRequestRepository,
  proposals: ServiceProposalRepository,
  orderContext?: { workOrderId: number; orders: WorkOrderRepository },
): Promise<ClaimReferenceDetails[]> {
  const [pendingRequests, ownProposals] = await Promise.all([
    requests.list(),
    proposals.getAll(),
  ]);

  const references: ClaimReferenceDetails[] = [
    ...pendingRequests.map((request) => ({
      reference: { kind: "job_request" as const, id: request.id },
      context: {
        title: request.title,
        description: request.description,
        person: getPersonName(request.requester),
        personRole: "requester" as const,
      },
    })),
    ...ownProposals.map((proposal) => ({
      reference: { kind: "service_proposal" as const, id: proposal.id },
      context: {
        title: proposal.description,
        scheduledOn: proposal.scheduledOn,
        status: proposal.status,
        person: getPersonName(proposal.counterpart),
        personRole: "counterpart" as const,
      },
    })),
  ];

  if (!orderContext) return references;

  const order = await orderContext.orders.getById(orderContext.workOrderId);
  if (!order) return references;

  const linkedProposal = ownProposals.find(
    (proposal) => proposal.id === order.serviceProposalId,
  );
  const linkedPerson = linkedProposal
    ? getPersonName(linkedProposal.counterpart)
    : undefined;
  references.push({
    reference: { kind: "work_order", id: order.id },
    context: {
      title: order.description,
      scheduledOn: order.scheduledOn,
      status: order.status,
      ...(linkedPerson
        ? { person: linkedPerson, personRole: "counterpart" as const }
        : {}),
    },
  });

  return references;
}
