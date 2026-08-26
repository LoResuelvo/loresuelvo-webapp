import { ApiServiceProposal, ApiServiceProposalSummary } from "@/infrastructure/api/types";
import { ServiceProposal, ServiceProposalSummary } from "@/domain/messaging/types";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { mapApiBookingTerms } from "./payment-mapper";

export function transformApiToServiceProposal(api: ApiServiceProposal): ServiceProposal {
  const money = Money.create(api.amount_cents);
  const scheduledOn = ScheduledDateTime.create(api.scheduled_on);
  const bookingTerms = mapApiBookingTerms(api.booking_terms);

  return {
    id: api.id,
    conversationId: api.conversation_id,
    consumerId: api.consumer_id,
    providerId: api.provider_id,
    amountCents: money.cents,
    scheduledOn: scheduledOn.isoString,
    description: api.description,
    estimatedDurationMinutes: api.estimated_duration_minutes ?? 60,
    status: api.status as "pending" | "accepted" | "rejected",
    ...(bookingTerms ? { bookingTerms } : {}),
  };
}

export function transformApiToServiceProposalSummary(
  api: ApiServiceProposalSummary
): ServiceProposalSummary {
  const money = Money.create(api.amount_cents);
  const scheduledOn = ScheduledDateTime.create(api.scheduled_on);
  const createdOn = ScheduledDateTime.create(api.created_on);
  const bookingTerms = mapApiBookingTerms(api.booking_terms);

  return {
    id: api.id,
    conversationId: api.conversation_id,
    amountCents: money.cents,
    scheduledOn: scheduledOn.isoString,
    description: api.description,
    estimatedDurationMinutes: api.estimated_duration_minutes ?? 60,
    status: api.status as "pending" | "accepted" | "rejected",
    createdOn: createdOn.isoString,
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
