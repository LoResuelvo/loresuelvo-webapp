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
        status: "pending",
      };

      (baseClient.api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await repository.create({
        consumerId: 1,
        amount: "15000.50",
        scheduledOn: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
      });

      expect(baseClient.api.post).toHaveBeenCalledWith("/service-proposals", {
        consumer_id: 1,
        amount: "15000.50",
        scheduled_on: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
      });

      expect(result).toEqual({
        id: 10,
        conversationId: 25,
        consumerId: 1,
        providerId: 2,
        amountCents: 1500050,
        scheduledOn: "2026-07-05T12:30:00Z",
        description: "Reparación de pérdida de agua...",
        status: "pending",
      });
    });
  });
});
