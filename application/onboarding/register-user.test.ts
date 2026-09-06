import { describe, expect, it, vi } from "vitest";
import { registerUser } from "./register-user";
import { UserRepository } from "@/ports/onboarding/user-repository";
import { AuthService } from "@/ports/onboarding/auth-service";
import { ROUTES } from "@/lib/routes";

describe("registerUser", () => {
  const mockUserRepository = {
    registerConsumer: vi.fn(),
    registerProvider: vi.fn(),
  } as unknown as UserRepository;

  const mockAuthService = {
    getSession: vi.fn(),
    updateSession: vi.fn(),
  } as unknown as AuthService;

  it("throws an error if user is unauthenticated", async () => {
    vi.mocked(mockAuthService.getSession).mockResolvedValue(null);

    await expect(
      registerUser(mockUserRepository, mockAuthService, {
        firstName: "Andres",
        lastName: "Test",
        role: "consumer",
      })
    ).rejects.toThrow("User is unauthenticated");
  });

  it("registers a consumer successfully, updates the session, and returns the correct redirect path", async () => {
    vi.mocked(mockAuthService.getSession).mockResolvedValue({
      user: { id: "1", email: "andres@test.com", firstName: "", lastName: "" },
    });

    const result = await registerUser(mockUserRepository, mockAuthService, {
      firstName: "Andres",
      lastName: "Gomez",
      role: "consumer",
    });

    expect(mockUserRepository.registerConsumer).toHaveBeenCalledWith(
      {
        email: "andres@test.com",
        name: "Andres",
        surname: "Gomez",
      },
      undefined
    );
    expect(mockAuthService.updateSession).toHaveBeenCalledWith({
      firstName: "Andres",
      lastName: "Gomez",
      isOnboarded: true,
      role: "consumer",
      profilePhotoUrl: undefined,
    });
    expect(result.redirectTo).toBe(ROUTES.consumer.home);
  });

  it("registers a consumer with profile photo successfully, updates session with photo URL", async () => {
    vi.mocked(mockAuthService.getSession).mockResolvedValue({
      user: { id: "1", email: "andres@test.com", firstName: "", lastName: "" },
    });
    vi.mocked(mockUserRepository.registerConsumer).mockResolvedValue({
      profilePhotoUrl: "http://example.com/consumer-avatar.png",
    });

    const result = await registerUser(mockUserRepository, mockAuthService, {
      firstName: "Ana",
      lastName: "Pérez",
      role: "consumer",
      profilePhotoId: "photo-456",
    });

    expect(mockUserRepository.registerConsumer).toHaveBeenCalledWith(
      {
        email: "andres@test.com",
        name: "Ana",
        surname: "Pérez",
      },
      "photo-456"
    );
    expect(mockAuthService.updateSession).toHaveBeenCalledWith({
      firstName: "Ana",
      lastName: "Pérez",
      isOnboarded: true,
      role: "consumer",
      profilePhotoUrl: "http://example.com/consumer-avatar.png",
    });
    expect(result.redirectTo).toBe(ROUTES.consumer.home);
  });

  it("registers a provider successfully, updates the session with photo URL, and returns the correct provider redirect path", async () => {
    vi.mocked(mockAuthService.getSession).mockResolvedValue({
      user: { id: "2", email: "prestador@test.com", firstName: "", lastName: "" },
    });

    const result = await registerUser(mockUserRepository, mockAuthService, {
      firstName: "Juan",
      lastName: "Pérez",
      role: "provider",
      categoryId: 1,
      profilePhotoId: "photo-123",
      profilePhotoUrl: "http://example.com/avatar.png",
    });

    expect(mockUserRepository.registerProvider).toHaveBeenCalledWith(
      {
        email: "prestador@test.com",
        name: "Juan",
        surname: "Pérez",
      },
      1,
      "photo-123",
      undefined
    );
    expect(mockAuthService.updateSession).toHaveBeenCalledWith({
      firstName: "Juan",
      lastName: "Pérez",
      isOnboarded: true,
      role: "provider",
      profilePhotoUrl: "http://example.com/avatar.png",
    });
    expect(result.redirectTo).toBe(ROUTES.provider.home);
  });

  it("registers a provider with coverage zones and passes them to repository", async () => {
    vi.mocked(mockAuthService.getSession).mockResolvedValue({
      user: { id: "2", email: "prestador@test.com", firstName: "", lastName: "" },
    });

    await registerUser(mockUserRepository, mockAuthService, {
      firstName: "Juan",
      lastName: "Pérez",
      role: "provider",
      categoryId: 1,
      profilePhotoId: "photo-123",
      coverageZoneIds: [6, 14],
    });

    expect(mockUserRepository.registerProvider).toHaveBeenCalledWith(
      {
        email: "prestador@test.com",
        name: "Juan",
        surname: "Pérez",
      },
      1,
      "photo-123",
      [6, 14]
    );
  });
});
