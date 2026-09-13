import { describe, expect, it } from "vitest";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import { mapApiToIdentityVerificationSession } from "./identity-verification-mapper";

describe("mapApiToIdentityVerificationSession", () => {
  it("maps the hosted URL and discards temporary credentials", () => {
    const result = mapApiToIdentityVerificationSession({
      session_id: "session-1",
      session_token: "secret-token",
      verification_url: "https://verify.example/session-1",
      status: "not_started",
    });

    expect(result).toEqual({ verificationUrl: "https://verify.example/session-1" });
    expect(result).not.toHaveProperty("sessionToken");
  });

  it("rejects an unknown session status", () => {
    expect(() =>
      mapApiToIdentityVerificationSession({
        session_id: "session-1",
        session_token: "secret-token",
        verification_url: "https://verify.example/session-1",
        status: "unknown",
      }),
    ).toThrowError(IdentityVerificationError);
  });

  it("rejects an unsafe navigation URL", () => {
    expect(() =>
      mapApiToIdentityVerificationSession({
        session_id: "session-1",
        session_token: "secret-token",
        verification_url: "javascript:alert(1)",
        status: "not_started",
      }),
    ).toThrowError(IdentityVerificationError);
  });
});
