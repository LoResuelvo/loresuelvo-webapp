import { describe, expect, it, vi } from "vitest";
import { getProviderCollections } from "./get-provider-collections";
import type { ProviderCollectionRepository } from "@/ports/provider/provider-collection-repository";

describe("get provider collections", () => {
  it("validates ranges before querying and propagates failures", async () => {
    const repository: ProviderCollectionRepository = { getTransactions: vi.fn(), getCollections: vi.fn().mockRejectedValue(new Error("unavailable")) };
    await expect(getProviderCollections(repository, { from: "2026-08-01T00:00:00Z" })).rejects.toThrow();
    expect(repository.getCollections).not.toHaveBeenCalled();
    await expect(getProviderCollections(repository)).rejects.toThrow("unavailable");
  });
});
