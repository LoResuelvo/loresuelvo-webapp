import { describe, expect, it } from "vitest";
import {
  identityVerificationStatuses,
  isIdentityVerificationStatus,
  isIdentityVerified,
} from "./types";

describe("identity verification status", () => {
  it("recognizes every API status", () => {
    expect(identityVerificationStatuses).toEqual([
      "unverified",
      "not_started",
      "in_progress",
      "awaiting_user",
      "in_review",
      "approved",
      "declined",
      "resubmitted",
      "abandoned",
      "expired",
      "kyc_expired",
    ]);
  });

  it("rejects unknown values", () => {
    expect(isIdentityVerificationStatus("unknown")).toBe(false);
    expect(isIdentityVerificationStatus(undefined)).toBe(false);
  });

  it("only treats approved as verified", () => {
    expect(isIdentityVerified("approved")).toBe(true);
    expect(isIdentityVerified("in_review")).toBe(false);
    expect(isIdentityVerified("unverified")).toBe(false);
  });
});
