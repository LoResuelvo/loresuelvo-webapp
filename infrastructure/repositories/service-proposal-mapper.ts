import { ApiServiceProposal } from "@/infrastructure/api/types";
import { ServiceProposal } from "@/domain/messaging/types";

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
