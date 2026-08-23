import { describe, expect, it } from "vitest";
import type { ApiProviderProfile } from "@/infrastructure/api/types";
import { mapApiProviderProfileToProvider } from "./provider-profile-mapper";

describe("mapApiProviderProfileToProvider", () => {
  it("maps nested public profile fields to the existing Provider model", () => {
    const apiProfile: ApiProviderProfile = {
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
    };

    expect(mapApiProviderProfileToProvider(apiProfile)).toEqual({
      id: 7,
      name: "Juan",
      surname: "Gómez",
      categoryName: "Plomería",
      categoryId: 1,
      profilePhotoUrl: "https://example.com/juan-gomez.jpg",
    });
  });
});
