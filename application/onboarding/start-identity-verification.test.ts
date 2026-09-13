import { describe, expect, it, vi } from "vitest";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import type { IdentityVerificationRepository } from "@/ports/onboarding/identity-verification-repository";
import type { UserRepository } from "@/ports/onboarding/user-repository";
import { startIdentityVerification } from "./start-identity-verification";

function aProviderUser(status: "approved" | "in_review") {
  return {
    id: 1,
    firstName: "Carlos",
    lastName: "López",
    email: "carlos@example.com",
    role: "provider" as const,
    calendarConnectionStatus: "disconnected" as const,
    profilePhoto: null,
    category: { id: 1, name: "Plomería" },
    identityVerificationStatus: status,
    identityVerifiedOn: status === "approved" ? "2026-09-13T12:00:00Z" : null,
  };
}

describe("startIdentityVerification", () => {
  it("returns only the hosted verification URL when a session starts", async () => {
    const identityRepository: IdentityVerificationRepository = {
      startSession: vi.fn().mockResolvedValue({
        verificationUrl: "https://verify.example/session-1",
      }),
    };
    const userReader: Pick<UserRepository, "getCurrentUser"> = {
      getCurrentUser: vi.fn(),
    };

    await expect(
      startIdentityVerification(identityRepository, userReader),
    ).resolves.toEqual({
      kind: "started",
      verificationUrl: "https://verify.example/session-1",
    });
    expect(userReader.getCurrentUser).not.toHaveBeenCalled();
  });

  it("confirms approval from a fresh profile after a start conflict", async () => {
    const identityRepository: IdentityVerificationRepository = {
      startSession: vi
        .fn()
        .mockRejectedValue(new IdentityVerificationError("conflict")),
    };
    const userReader: Pick<UserRepository, "getCurrentUser"> = {
      getCurrentUser: vi.fn().mockResolvedValue(aProviderUser("approved")),
    };

    await expect(
      startIdentityVerification(identityRepository, userReader),
    ).resolves.toEqual({ kind: "already_verified" });
    expect(userReader.getCurrentUser).toHaveBeenCalledOnce();
  });

  it("does not infer approval when the fresh profile is not approved", async () => {
    const conflict = new IdentityVerificationError("conflict");
    const identityRepository: IdentityVerificationRepository = {
      startSession: vi.fn().mockRejectedValue(conflict),
    };
    const userReader: Pick<UserRepository, "getCurrentUser"> = {
      getCurrentUser: vi.fn().mockResolvedValue(aProviderUser("in_review")),
    };

    await expect(
      startIdentityVerification(identityRepository, userReader),
    ).rejects.toBe(conflict);
  });

  it("propagates start failures without reading the profile", async () => {
    const error = new IdentityVerificationError("temporary");
    const identityRepository: IdentityVerificationRepository = {
      startSession: vi.fn().mockRejectedValue(error),
    };
    const userReader: Pick<UserRepository, "getCurrentUser"> = {
      getCurrentUser: vi.fn(),
    };

    await expect(
      startIdentityVerification(identityRepository, userReader),
    ).rejects.toBe(error);
    expect(userReader.getCurrentUser).not.toHaveBeenCalled();
  });
});
