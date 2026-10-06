import { describe, expect, it, vi } from "vitest";
import { getProviderReputation } from "./get-provider-reputation";
import type { ProviderReputationRepository } from "@/ports/provider/provider-reputation-repository";
import type { ProviderReputation } from "@/domain/provider/reputation";

const mockReputation: ProviderReputation = {
  calculatedAt: "2026-08-31T00:00:00-03:00",
  averageRating: 4.8,
  reviewCount: 5,
  ratingDistribution: [
    { rating: 5, count: 4 },
    { rating: 4, count: 1 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
  eligiblePaidOrders: 6,
  reviewedPaidOrders: 5,
  coveragePercentage: 83.33,
  reviews: [],
  nextCursor: null,
};

describe("getProviderReputation", () => {
  it("delegates to repository with optional query", async () => {
    const mockRepo: ProviderReputationRepository = {
      getReputation: vi.fn().mockResolvedValue(mockReputation),
    };

    const result = await getProviderReputation(mockRepo, { limit: 10 });
    expect(mockRepo.getReputation).toHaveBeenCalledWith({ limit: 10 });
    expect(result).toBe(mockReputation);
  });
});
