export type IdentityVerificationErrorCode =
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "temporary"
  | "invalid_response";

export class IdentityVerificationError extends Error {
  constructor(public readonly code: IdentityVerificationErrorCode) {
    super(`Identity verification operation failed: ${code}`);
    this.name = "IdentityVerificationError";
  }
}
