import { describe, expect, it } from "vitest";
import {
  classifyIdentityVerificationStatus,
  isIdentityVerificationPending,
} from "./result";

describe("classifyIdentityVerificationStatus", () => {
  it.each([
    ["unverified", "not_started"],
    ["not_started", "not_started"],
    ["in_progress", "pending"],
    ["awaiting_user", "pending"],
    ["in_review", "pending"],
    ["approved", "verified"],
    ["declined", "declined"],
    ["resubmitted", "pending"],
    ["abandoned", "abandoned"],
    ["expired", "expired"],
    ["kyc_expired", "expired"],
  ] as const)("maps %s to %s", (status, kind) => {
    expect(classifyIdentityVerificationStatus(status)).toBe(kind);
  });

  it("only treats review lifecycle states as pending", () => {
    expect(isIdentityVerificationPending("in_review")).toBe(true);
    expect(isIdentityVerificationPending("approved")).toBe(false);
    expect(isIdentityVerificationPending("kyc_expired")).toBe(false);
  });
});
