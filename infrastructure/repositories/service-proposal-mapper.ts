import { ApiServiceProposal, ApiServiceProposalSummary } from "@/infrastructure/api/types";
import { ServiceProposal, ServiceProposalSummary } from "@/domain/messaging/types";

export function transformApiToServiceProposal(api: ApiServiceProposal): ServiceProposal {
  return {
    id: api.id,
    conversationId: api.conversation_id,
    consumerId: api.consumer_id,
    providerId: api.provider_id,
    amountCents: api.amount_cents,
    scheduledOn: api.scheduled_on,
    description: api.description,
    status: api.status as "pending" | "accepted" | "rejected",
  };
}

export function transformApiToServiceProposalSummary(
  api: ApiServiceProposalSummary
): ServiceProposalSummary {
  return {
    id: api.id,
    conversationId: api.conversation_id,
    amountCents: api.amount_cents,
    scheduledOn: api.scheduled_on,
    description: api.description,
    status: api.status as "pending" | "accepted" | "rejected",
    createdOn: api.created_on,
    counterpart: {
      id: api.counterpart.id,
      role: api.counterpart.role as "consumer" | "provider",
      name: api.counterpart.name,
      surname: api.counterpart.surname,
      categoryName: api.counterpart.category_name,
      profilePhotoUrl: api.counterpart.profile_photo_url,
    },
  };
}
