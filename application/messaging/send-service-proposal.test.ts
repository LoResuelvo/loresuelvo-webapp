import { describe, expect, it, vi } from "vitest";
import { sendServiceProposal } from "./send-service-proposal";
import { ServiceProposalRepository } from "@/ports/service-proposal-repository";
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
      status: "pending",
    };

    vi.mocked(mockServiceProposalRepository.create).mockResolvedValue(mockProposal);

    const input = {
      consumerId: 1,
      amount: "15000.50",
      scheduledOn: "2026-07-05T12:30:00Z",
      description: "Reparación de pérdida de agua...",
    };

    const res = await sendServiceProposal(mockServiceProposalRepository, input);

    expect(res).toEqual(mockProposal);
    expect(mockServiceProposalRepository.create).toHaveBeenCalledWith(input);
  });
});
