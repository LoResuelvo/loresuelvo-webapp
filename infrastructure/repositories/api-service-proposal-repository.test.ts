import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiServiceProposalRepository } from "./api-service-proposal-repository";
import * as baseClient from "@/infrastructure/api/base-client";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("ApiServiceProposalRepository", () => {
  let repository: ApiServiceProposalRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiServiceProposalRepository();
  });

  describe("create", () => {
    it("calls POST /service-proposals with correct payload and maps response", async () => {
      const mockResponse = {
        id: 10,
        conversation_id: 25,
        consumer_id: 1,
        provider_id: 2,
        amount_cents: 1500050,
        scheduled_on: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
        estimated_duration_minutes: 60,
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

      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await repository.create({
        consumerId: 1,
        amount: "15000.50",
        scheduledOn: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
        estimatedDurationMinutes: 60,
      });

      expect(baseClient.api.post).toHaveBeenCalledWith("/service-proposals", {
        consumer_id: 1,
        amount: "15000.50",
        scheduled_on: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
        estimated_duration_minutes: 60,
      });

      expect(result).toEqual({
        id: 10,
        conversationId: 25,
        consumerId: 1,
        providerId: 2,
        amountCents: 1500050,
        scheduledOn: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
        estimatedDurationMinutes: 60,
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
});
