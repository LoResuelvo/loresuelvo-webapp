import { ApiServiceProposal, ApiServiceProposalSummary } from "@/infrastructure/api/types";
import { ServiceProposal, ServiceProposalSummary } from "@/domain/messaging/types";
import { mapApiBookingTerms } from "./payment-mapper";

export function transformApiToServiceProposal(api: ApiServiceProposal): ServiceProposal {
  const bookingTerms = mapApiBookingTerms(api.booking_terms);
  return {
    id: api.id,
    conversationId: api.conversation_id,
    consumerId: api.consumer_id,
    providerId: api.provider_id,
    amountCents: api.amount_cents,
    scheduledOn: api.scheduled_on,
    description: api.description,
    status: api.status as "pending" | "accepted" | "rejected",
    ...(bookingTerms ? { bookingTerms } : {}),
  };
}

export function transformApiToServiceProposalSummary(
  api: ApiServiceProposalSummary
): ServiceProposalSummary {
  const bookingTerms = mapApiBookingTerms(api.booking_terms);
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
    ...(bookingTerms ? { bookingTerms } : {}),
  };
}
