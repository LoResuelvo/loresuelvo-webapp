import { describe, it, expect, vi } from "vitest";
import { getServiceProposals } from "./get-service-proposals";
import { ServiceProposalRepository } from "@/ports/service-proposal-repository";
import { ServiceProposalSummary } from "@/domain/messaging/types";

describe("getServiceProposals", () => {
  it("should return service proposals from the repository", async () => {
    const mockProposals: ServiceProposalSummary[] = [
      {
        id: 1,
        conversationId: 2,
        amountCents: 1000,
        scheduledOn: "2026-07-05T09:30:00Z",
        description: "test",
        status: "pending",
        createdOn: "2026-07-04T10:00:00Z",
        counterpart: {
          id: 5,
          role: "provider",
          name: "Juan",
          surname: "Gómez",
        },
      },
    ];

    const mockRepository = {
      getAll: vi.fn().mockResolvedValue(mockProposals),
    } as unknown as ServiceProposalRepository;

    const result = await getServiceProposals(mockRepository);

    expect(mockRepository.getAll).toHaveBeenCalled();
    expect(result).toEqual(mockProposals);
  });
});
