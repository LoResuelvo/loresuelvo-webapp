import { describe, expect, it, vi } from "vitest";
import { sendServiceProposal } from "./send-service-proposal";
import { ServiceProposalRepository } from "@/ports/messaging/service-proposal-repository";
import { ServiceProposal } from "@/domain/messaging/types";

describe("sendServiceProposal", () => {
  const mockServiceProposalRepository = {
    create: vi.fn(),
  } as unknown as ServiceProposalRepository;

  it("calls create on repository with input data and returns created service proposal", async () => {
    const mockProposal: ServiceProposal = {
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
    };

    vi.mocked(mockServiceProposalRepository.create).mockResolvedValue(mockProposal);

    const input = {
      consumerId: 1,
      amount: "15000.50",
      scheduledOn: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
      estimatedDurationMinutes: 60,
    };

    const res = await sendServiceProposal(mockServiceProposalRepository, input);

    expect(res).toEqual(mockProposal);
    expect(mockServiceProposalRepository.create).toHaveBeenCalledWith(input);
  });
});
