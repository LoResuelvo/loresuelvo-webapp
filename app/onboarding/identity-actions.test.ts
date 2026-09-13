import { describe, expect, it, vi } from "vitest";
import { startIdentityVerification } from "@/application/onboarding/start-identity-verification";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import { startIdentityVerificationAction } from "./identity-actions";

vi.mock("@/application/onboarding/start-identity-verification", () => ({
  startIdentityVerification: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/identity-verification/api-identity-verification-repository", () => ({
  ApiIdentityVerificationRepository: class MockApiIdentityVerificationRepository {},
}));

vi.mock("@/infrastructure/repositories/onboarding/api-user-repository", () => ({
  ApiUserRepository: class MockApiUserRepository {},
}));

vi.mock("@/infrastructure/auth", () => ({
  getAuthService: vi.fn(),
}));

describe("startIdentityVerificationAction", () => {
  it("returns a serializable safe URL result", async () => {
    vi.mocked(startIdentityVerification).mockResolvedValue({
      kind: "started",
      verificationUrl: "https://verify.example/session-1",
    });

    await expect(startIdentityVerificationAction()).resolves.toEqual({
      success: true,
      data: {
        kind: "started",
        verificationUrl: "https://verify.example/session-1",
      },
    });
  });

  it("returns the approved state without exposing session credentials", async () => {
    vi.mocked(startIdentityVerification).mockResolvedValue({
      kind: "already_verified",
    });

    await expect(startIdentityVerificationAction()).resolves.toEqual({
      success: true,
      data: { kind: "already_verified" },
    });
  });

  it("translates known failures to safe Spanish messages", async () => {
    vi.mocked(startIdentityVerification).mockRejectedValue(
      new IdentityVerificationError("unauthorized"),
    );

    await expect(startIdentityVerificationAction()).resolves.toEqual({
      success: false,
      code: "unauthorized",
      error: "Tu sesión venció. Iniciá sesión nuevamente para verificar tu identidad.",
    });
  });

  it("does not leak unknown error details", async () => {
    vi.mocked(startIdentityVerification).mockRejectedValue(
      new Error("session_token=secret-value"),
    );

    const result = await startIdentityVerificationAction();
    expect(result).toEqual({
      success: false,
      code: "generic",
      error: "No pudimos iniciar la verificación de identidad. Intentá nuevamente o continuá más tarde.",
    });
    expect(JSON.stringify(result)).not.toContain("secret-value");
  });
});
