import { describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { aCollectionResponse, aCollectionTransactionsResponse } from "@/features/support/collection-factory";
import { ApiProviderCollectionRepository } from "./api-provider-collection-repository";
vi.mock("@/infrastructure/api/base-client", () => ({ api: { get: vi.fn() } }));
describe("collection repository", () => {
  it("keeps detail parameters independent from summary grouping and comparison", async () => {
    vi.mocked(api.get).mockResolvedValue(aCollectionTransactionsResponse("booking_deposit"));
    const query = { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", purpose: "booking_deposit" as const, granularity: "month", comparePrevious: true };
    const detail = await new ApiProviderCollectionRepository().getTransactions(query);
    const endpoint = vi.mocked(api.get).mock.lastCall?.[0];
    const params = new URLSearchParams(endpoint?.split("?")[1]);
    expect([...params.keys()]).toEqual(["from", "to", "purpose"]);
    expect(params.get("purpose")).toBe("booking_deposit");
    expect(detail.totalCount).toBe(23);
  });
  it("rejects a response period with different submillisecond bounds", async () => {
    const source = aCollectionTransactionsResponse();
    source.period.from = "2026-08-01T00:00:00.000900-03:00";
    vi.mocked(api.get).mockResolvedValue(source);
    await expect(new ApiProviderCollectionRepository().getTransactions({ from: "2026-08-01T00:00:00.000100-03:00", to: source.period.to })).rejects.toThrow("Mismatched transaction period");
  });
  it("queries only the authenticated actor endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue(aCollectionResponse());
    const result = await new ApiProviderCollectionRepository().getCollections({});
    expect(api.get).toHaveBeenCalledWith("/providers/me/statistics/collections");
    expect(result.results.totalCents).toBe(4000003);
  });
});
