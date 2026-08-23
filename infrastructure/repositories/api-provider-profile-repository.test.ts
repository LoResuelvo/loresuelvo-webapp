import { beforeEach, describe, expect, it, vi } from "vitest";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiProviderProfileRepository } from "./api-provider-profile-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("ApiProviderProfileRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets the provider profile and maps the public fields", async () => {
    vi.mocked(baseClient.api.get).mockResolvedValue({
      id: 7,
      name: "Juan",
      surname: "Gómez",
      profile_photo: {
        original_name: "juan-gomez.jpg",
        url: "https://example.com/juan-gomez.jpg",
      },
      category: {
        id: 1,
        name: "Plomería",
      },
    });

    const result = await new ApiProviderProfileRepository().getById(7);

    expect(baseClient.api.get).toHaveBeenCalledWith("/providers/7");
    expect(result).toEqual({
      id: 7,
      name: "Juan",
      surname: "Gómez",
      categoryName: "Plomería",
      categoryId: 1,
      profilePhotoUrl: "https://example.com/juan-gomez.jpg",
    });
  });
});
