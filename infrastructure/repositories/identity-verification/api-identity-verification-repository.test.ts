import { beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiIdentityVerificationRepository } from "./api-identity-verification-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    post: vi.fn(),
  },
  ApiClientError: class MockApiClientError extends Error {
    constructor(
      public status: number,
      message = "API error",
    ) {
      super(message);
    }
  },
}));

describe("ApiIdentityVerificationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a session without sending a request body", async () => {
    vi.mocked(baseClient.api.post).mockResolvedValue({
      session_id: "session-1",
      session_token: "secret-token",
      verification_url: "https://verify.example/session-1",
      status: "not_started",
    });

    const result = await new ApiIdentityVerificationRepository().startSession();

    expect(baseClient.api.post).toHaveBeenCalledWith(
      "/providers/me/identity-verification-sessions",
      undefined,
    );
    expect(result).toEqual({ verificationUrl: "https://verify.example/session-1" });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [409, "conflict"],
    [500, "temporary"],
    [503, "temporary"],
  ] as const)("maps HTTP %s to a safe domain error", async (status, code) => {
    vi.mocked(baseClient.api.post).mockRejectedValue(
      new baseClient.ApiClientError(status, "Error"),
    );

    await expect(new ApiIdentityVerificationRepository().startSession()).rejects.toMatchObject({ code });
  });

  it("does not expose external response details on an invalid response", async () => {
    vi.mocked(baseClient.api.post).mockResolvedValue({
      session_id: "session-1",
      session_token: "secret-token",
      verification_url: "https://verify.example/session-1",
      status: "invalid",
    });

    await expect(new ApiIdentityVerificationRepository().startSession()).rejects.toBeInstanceOf(
      IdentityVerificationError,
    );
  });
});
