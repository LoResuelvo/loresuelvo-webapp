import type { IdentityVerificationStatus } from "./types";

export type IdentityVerificationResultKind =
  | "verified"
  | "pending"
  | "declined"
  | "abandoned"
  | "expired"
  | "not_started";

export function classifyIdentityVerificationStatus(
  status: IdentityVerificationStatus,
): IdentityVerificationResultKind {
  switch (status) {
    case "approved":
      return "verified";
    case "in_progress":
    case "awaiting_user":
    case "in_review":
    case "resubmitted":
      return "pending";
    case "declined":
      return "declined";
    case "abandoned":
      return "abandoned";
    case "expired":
    case "kyc_expired":
      return "expired";
    case "unverified":
    case "not_started":
      return "not_started";
  }
}

export function isIdentityVerificationPending(
  status: IdentityVerificationStatus,
): boolean {
  return classifyIdentityVerificationStatus(status) === "pending";
}
