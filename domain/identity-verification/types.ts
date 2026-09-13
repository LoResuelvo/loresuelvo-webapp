export const identityVerificationStatuses = [
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
] as const;

export type IdentityVerificationStatus = (typeof identityVerificationStatuses)[number];

export interface IdentityVerificationSession {
  verificationUrl: string;
}

export function isIdentityVerificationStatus(
  value: unknown,
): value is IdentityVerificationStatus {
  return (
    typeof value === "string" &&
    identityVerificationStatuses.includes(value as IdentityVerificationStatus)
  );
}

export function isIdentityVerified(status: IdentityVerificationStatus): boolean {
  return status === "approved";
}
