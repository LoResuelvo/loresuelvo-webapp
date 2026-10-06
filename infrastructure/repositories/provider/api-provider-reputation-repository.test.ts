import { describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiProviderReputationRepository, reputationEndpoint } from "./api-provider-reputation-repository";
import { aReputationResponse } from "@/features/support/reputation-factory";

vi.mock("@/infrastructure/api/base-client", () => ({ api: { get: vi.fn() } }));

describe("ApiProviderReputationRepository", () => {
  it("queries the endpoint without query params when not provided and maps the response", async () => {
    vi.mocked(api.get).mockResolvedValue(aReputationResponse());
    const repo = new ApiProviderReputationRepository();
    const reputation = await repo.getReputation();

    expect(api.get).toHaveBeenCalledWith("/providers/me/statistics/reputation");
    expect(reputation.averageRating).toBe(4.8);
    expect(reputation.reviewCount).toBe(5);
  });

  it("encodes query params when limit or cursor are provided", async () => {
    vi.mocked(api.get).mockResolvedValue(aReputationResponse());
    const repo = new ApiProviderReputationRepository();
    await repo.getReputation({ limit: 10, cursor: "next-abc" });

    expect(api.get).toHaveBeenCalledWith("/providers/me/statistics/reputation?limit=10&cursor=next-abc");
  });

  it("reputationEndpoint encodes query params correctly", () => {
    expect(reputationEndpoint()).toBe("/providers/me/statistics/reputation");
    expect(reputationEndpoint({})).toBe("/providers/me/statistics/reputation");
    expect(reputationEndpoint({ limit: 5 })).toBe("/providers/me/statistics/reputation?limit=5");
    expect(reputationEndpoint({ cursor: "xyz" })).toBe("/providers/me/statistics/reputation?cursor=xyz");
  });
});
