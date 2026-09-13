import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import type { IdentityVerificationRepository } from "@/ports/onboarding/identity-verification-repository";
import { api, ApiClientError } from "@/infrastructure/api/base-client";
import type { ApiIdentityVerificationSessionResponse } from "@/infrastructure/api/types";
import { mapApiToIdentityVerificationSession } from "./identity-verification-mapper";

const IDENTITY_VERIFICATION_SESSIONS_ENDPOINT =
  "/providers/me/identity-verification-sessions";

function mapStartError(error: unknown): never {
  if (!(error instanceof ApiClientError)) {
    throw error;
  }

  if (error.status === 401) {
    throw new IdentityVerificationError("unauthorized");
  }

  if (error.status === 403) {
    throw new IdentityVerificationError("forbidden");
  }

  if (error.status === 409) {
    throw new IdentityVerificationError("conflict");
  }

  if (error.status >= 500 || error.status === 408) {
    throw new IdentityVerificationError("temporary");
  }

  throw new IdentityVerificationError("invalid_response");
}

export class ApiIdentityVerificationRepository implements IdentityVerificationRepository {
  async startSession() {
    try {
      const response = await api.post<ApiIdentityVerificationSessionResponse>(
        IDENTITY_VERIFICATION_SESSIONS_ENDPOINT,
        undefined,
      );
      return mapApiToIdentityVerificationSession(response);
    } catch (error: unknown) {
      return mapStartError(error);
    }
  }
}
