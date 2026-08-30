import { describe, expect, it } from "vitest";
import { mapApiToCurrentUser } from "./current-user-mapper";
import {
  ApiConsumerCurrentUserResponse,
  ApiProviderCurrentUserResponse
} from "@/infrastructure/api/types";

describe("mapApiToCurrentUser", () => {
  it("maps consumer response correctly with profile photo", () => {
    const apiResponse: ApiConsumerCurrentUserResponse = {
      id: 1,
      name: "Ana",
      surname: "Pérez",
      email: "ana@example.com",
      role: "consumer",
      profile_photo: {
        original_name: "avatar.png",
        url: "https://example.com/avatar.png",
      },
    };

    const user = mapApiToCurrentUser(apiResponse);

    expect(user).toEqual({
      id: 1,
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: "consumer",
      profilePhoto: {
        originalName: "avatar.png",
        url: "https://example.com/avatar.png",
      },
    });
  });

  it("maps consumer response without profile photo", () => {
    const apiResponse: ApiConsumerCurrentUserResponse = {
      id: 1,
      name: "Ana",
      surname: "Pérez",
      email: "ana@example.com",
      role: "consumer",
      profile_photo: null,
    };

    const user = mapApiToCurrentUser(apiResponse);

    expect(user.profilePhoto).toBeNull();
  });

  it("maps provider response with category and photo", () => {
    const apiResponse: ApiProviderCurrentUserResponse = {
      id: 2,
      name: "Juan",
      surname: "Gómez",
      email: "juan@example.com",
      role: "provider",
      profile_photo: {
        original_name: "foto.jpg",
        url: "https://example.com/foto.jpg",
      },
      category: {
        id: 10,
        name: "Plomería",
      },
    };

    const user = mapApiToCurrentUser(apiResponse);

    expect(user).toEqual({
      id: 2,
      firstName: "Juan",
      lastName: "Gómez",
      email: "juan@example.com",
      role: "provider",
      profilePhoto: {
        originalName: "foto.jpg",
        url: "https://example.com/foto.jpg",
      },
      category: {
        id: 10,
        name: "Plomería",
      },
    });
  });
});
