import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./get-current-user";
import { UserRepository } from "@/ports/user-repository";
import { AuthService } from "@/ports/auth-service";
import { CurrentUser } from "@/domain/user/types";

describe("getCurrentUser", () => {
  it("fetches current user profile and updates session", async () => {
    const mockUser: CurrentUser = {
      id: 1,
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: "consumer",
      profilePhoto: {
        originalName: "avatar.png",
        url: "https://example.com/avatar.png",
      },
    };

    const mockUserRepo: UserRepository = {
      registerProvider: vi.fn(),
      registerConsumer: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue(mockUser),
    };

    const mockAuthService: AuthService = {
      getSession: vi.fn().mockResolvedValue({
        accessToken: "mock-token",
        user: { id: "1", email: "ana@example.com", firstName: "Ana", lastName: "Pérez" },
      }),
      updateSession: vi.fn().mockResolvedValue(undefined),
    };

    const result = await getCurrentUser(mockUserRepo, mockAuthService);

    expect(mockUserRepo.getCurrentUser).toHaveBeenCalledOnce();
    expect(mockAuthService.updateSession).toHaveBeenCalledWith({
      firstName: "Ana",
      lastName: "Pérez",
      profilePhotoUrl: "https://example.com/avatar.png",
      role: "consumer",
    });
    expect(result).toEqual(mockUser);
  });

  it("throws error if user is unauthenticated", async () => {
    const mockUserRepo: UserRepository = {
      registerProvider: vi.fn(),
      registerConsumer: vi.fn(),
      getCurrentUser: vi.fn(),
    };

    const mockAuthService: AuthService = {
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn(),
    };

    await expect(getCurrentUser(mockUserRepo, mockAuthService)).rejects.toThrow(
      "User is unauthenticated"
    );
  });

  it("propagates repository errors", async () => {
    const mockUserRepo: UserRepository = {
      registerProvider: vi.fn(),
      registerConsumer: vi.fn(),
      getCurrentUser: vi.fn().mockRejectedValue(new Error("API Error")),
    };

    const mockAuthService: AuthService = {
      getSession: vi.fn().mockResolvedValue({
        accessToken: "mock-token",
        user: { id: "1", email: "ana@example.com", firstName: "Ana", lastName: "Pérez" },
      }),
      updateSession: vi.fn(),
    };

    await expect(getCurrentUser(mockUserRepo, mockAuthService)).rejects.toThrow("API Error");
  });
});
