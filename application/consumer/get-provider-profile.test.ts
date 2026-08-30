import { describe, expect, it, vi } from "vitest";
import type { ProviderProfile } from "@/domain/provider/types";
import type { ProviderProfileRepository } from "@/ports/consumer/provider-profile-repository";
import { getProviderProfile } from "./get-provider-profile";

const provider: ProviderProfile = {
  id: 7,
  name: "Juan",
  surname: "Gómez",
  categoryName: "Plomería",
  categoryId: 1,
  profilePhotoUrl: "https://example.com/juan-gomez.jpg",
  rating: 4.8,
  reviews: 12,
  workOrders: [],
};

describe("getProviderProfile", () => {
  it("delegates the provider id to the repository", async () => {
    const repository = {
      getById: vi.fn().mockResolvedValue(provider),
    } satisfies ProviderProfileRepository;

    await expect(getProviderProfile(repository, 7)).resolves.toEqual(provider);
    expect(repository.getById).toHaveBeenCalledWith(7);
  });

  it("propagates repository errors", async () => {
    const error = new Error("Provider profile unavailable");
    const repository = {
      getById: vi.fn().mockRejectedValue(error),
    } satisfies ProviderProfileRepository;

    await expect(getProviderProfile(repository, 7)).rejects.toBe(error);
  });
});
