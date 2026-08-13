import { describe, expect, it } from "vitest";
import { transformApiToServiceProposal, transformApiToServiceProposalSummary } from "./service-proposal-mapper";
import { ApiServiceProposal, ApiServiceProposalSummary } from "@/infrastructure/api/types";

describe("transformApiToServiceProposal", () => {
  it("transforms ApiServiceProposal to ServiceProposal successfully", () => {
    const apiProposal: ApiServiceProposal = {
      id: 10,
      conversation_id: 25,
      consumer_id: 1,
      provider_id: 2,
      amount_cents: 1500050,
      scheduled_on: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
      status: "pending",
      booking_terms: {
        currency: "ARS",
        service_total_cents: 1_500_050,
        deposit_cents: 300_010,
        remaining_service_balance_cents: 1_200_040,
        platform_fee_total_cents: 500_000,
        platform_fee_due_now_cents: 100_000,
        remaining_platform_fee_cents: 400_000,
        amount_due_now_cents: 400_010,
        remaining_amount_due_cents: 1_600_040,
        contract_total_cents: 2_000_050,
        booking_payment_deadline: "2026-07-04T12:30:00Z",
      },
    };

    const domainProposal = transformApiToServiceProposal(apiProposal);

    expect(domainProposal).toEqual({
      id: 10,
      conversationId: 25,
      consumerId: 1,
      providerId: 2,
      amountCents: 1500050,
      scheduledOn: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
      status: "pending",
      bookingTerms: {
        currency: "ARS",
        serviceTotalCents: 1_500_050,
        depositCents: 300_010,
        remainingServiceBalanceCents: 1_200_040,
        platformFeeTotalCents: 500_000,
        platformFeeDueNowCents: 100_000,
        remainingPlatformFeeCents: 400_000,
        amountDueNowCents: 400_010,
        remainingAmountDueCents: 1_600_040,
        contractTotalCents: 2_000_050,
        bookingPaymentDeadline: "2026-07-04T12:30:00Z",
      },
    });
  });
});

describe("transformApiToServiceProposalSummary", () => {
  it("transforms ApiServiceProposalSummary to ServiceProposalSummary successfully", () => {
    const apiModel: ApiServiceProposalSummary = {
      id: 1,
      conversation_id: 2,
      amount_cents: 1000,
      scheduled_on: "2026-07-05T09:30:00Z",
      description: "test description",
      status: "pending",
      created_on: "2026-07-04T10:00:00Z",
      counterpart: {
        id: 5,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        category_name: "Plomería",
        profile_photo_url: "https://example.com/photo.jpg",
      },
      booking_terms: {
        currency: "ARS",
        service_total_cents: 10_000_000,
        deposit_cents: 2_000_000,
        remaining_service_balance_cents: 8_000_000,
        platform_fee_total_cents: 500_000,
        platform_fee_due_now_cents: 100_000,
        remaining_platform_fee_cents: 400_000,
        amount_due_now_cents: 2_100_000,
        remaining_amount_due_cents: 8_400_000,
        contract_total_cents: 10_500_000,
        booking_payment_deadline: "2026-07-04T12:30:00Z",
      },
    };

    const result = transformApiToServiceProposalSummary(apiModel);

    expect(result).toEqual({
      id: 1,
      conversationId: 2,
      amountCents: 1000,
      scheduledOn: "2026-07-05T09:30:00Z",
      description: "test description",
      status: "pending",
      createdOn: "2026-07-04T10:00:00Z",
      counterpart: {
        id: 5,
        role: "provider",
        name: "Juan",
        surname: "Gómez",
        categoryName: "Plomería",
        profilePhotoUrl: "https://example.com/photo.jpg",
      },
      bookingTerms: {
        currency: "ARS",
        serviceTotalCents: 10_000_000,
        depositCents: 2_000_000,
        remainingServiceBalanceCents: 8_000_000,
        platformFeeTotalCents: 500_000,
        platformFeeDueNowCents: 100_000,
        remainingPlatformFeeCents: 400_000,
        amountDueNowCents: 2_100_000,
        remainingAmountDueCents: 8_400_000,
        contractTotalCents: 10_500_000,
        bookingPaymentDeadline: "2026-07-04T12:30:00Z",
      },
    });
  });
});
