import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import { readIdentityVerificationStatusAction } from "./identity-status-actions";

const getCurrentUser = vi.fn();

vi.mock("@/infrastructure/repositories/onboarding/api-user-repository", () => ({
  ApiUserRepository: class MockApiUserRepository {
    getCurrentUser = getCurrentUser;
  },
}));

function aProvider(status: "in_review" | "approved") {
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

describe("readIdentityVerificationStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the provider status from a fresh profile", async () => {
    getCurrentUser.mockResolvedValue(aProvider("in_review"));

    await expect(readIdentityVerificationStatusAction()).resolves.toEqual({
      success: true,
      data: { status: "in_review" },
    });
  });

  it("does not expose an identity result to consumers", async () => {
    getCurrentUser.mockResolvedValue({
      id: 2,
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      role: "consumer" as const,
      calendarConnectionStatus: "disconnected" as const,
      profilePhoto: null,
    });

    await expect(readIdentityVerificationStatusAction()).resolves.toEqual({
      success: false,
      code: "forbidden",
      error: "Tu cuenta no puede iniciar esta verificación.",
    });
  });

  it("translates session and temporary failures to safe messages", async () => {
    getCurrentUser.mockRejectedValueOnce(new ApiClientError(401, "Unauthorized", "secret"));
    await expect(readIdentityVerificationStatusAction()).resolves.toEqual({
      success: false,
      code: "unauthorized",
      error: "Tu sesión venció. Iniciá sesión nuevamente para verificar tu identidad.",
    });

    getCurrentUser.mockRejectedValueOnce(new ApiClientError(503, "Unavailable", "secret"));
    await expect(readIdentityVerificationStatusAction()).resolves.toEqual({
      success: false,
      code: "temporary",
      error: "No pudimos iniciar la verificación en este momento. Intentá nuevamente o continuá más tarde.",
    });
  });

  it("turns malformed status data into a controlled read error", async () => {
    getCurrentUser.mockRejectedValue(new IdentityVerificationError("invalid_response"));

    const result = await readIdentityVerificationStatusAction();

    expect(result).toEqual({
      success: false,
      code: "generic",
      error: "No pudimos consultar el estado de tu identidad. Intentá nuevamente más tarde.",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
