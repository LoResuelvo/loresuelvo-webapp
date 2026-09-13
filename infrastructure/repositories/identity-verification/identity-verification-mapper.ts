import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import {
  isIdentityVerificationStatus,
  IdentityVerificationSession,
} from "@/domain/identity-verification/types";
import type { ApiIdentityVerificationSessionResponse } from "@/infrastructure/api/types";

function isSafeNavigationUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function mapApiToIdentityVerificationSession(
  api: ApiIdentityVerificationSessionResponse,
): IdentityVerificationSession {
  if (
    typeof api.session_id !== "string" ||
    api.session_id.trim() === "" ||
    typeof api.session_token !== "string" ||
    api.session_token.trim() === "" ||
    !isIdentityVerificationStatus(api.status) ||
    !isSafeNavigationUrl(api.verification_url)
  ) {
    throw new IdentityVerificationError("invalid_response");
  }

  return { verificationUrl: api.verification_url };
}
