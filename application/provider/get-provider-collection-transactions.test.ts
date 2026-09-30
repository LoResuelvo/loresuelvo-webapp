import { describe, expect, it, vi } from "vitest";
import { getProviderCollectionTransactions } from "./get-provider-collection-transactions";
import type { ProviderCollectionRepository } from "@/ports/provider/provider-collection-repository";
describe("get provider collection transactions", () => {
  it("validates bounds before querying and propagates errors without requesting summary", async () => {
    const repository: ProviderCollectionRepository = { getCollections: vi.fn(), getTransactions: vi.fn().mockRejectedValue(new Error("unavailable")) };
    await expect(getProviderCollectionTransactions(repository, { from: "", to: "" })).rejects.toThrow();
    expect(repository.getTransactions).not.toHaveBeenCalled();
    await expect(getProviderCollectionTransactions(repository, { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", purpose: "booking_deposit" })).rejects.toThrow("unavailable");
    expect(repository.getCollections).not.toHaveBeenCalled();
  });
});
