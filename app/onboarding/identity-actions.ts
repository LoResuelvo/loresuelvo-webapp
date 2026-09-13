"use server";

import { startIdentityVerification } from "@/application/onboarding/start-identity-verification";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { t } from "@/infrastructure/i18n/translations";
import { ApiIdentityVerificationRepository } from "@/infrastructure/repositories/identity-verification/api-identity-verification-repository";
import { ApiUserRepository } from "@/infrastructure/repositories/onboarding/api-user-repository";

export type IdentityVerificationActionErrorCode =
  | "unauthorized"
  | "forbidden"
  | "temporary"
  | "generic";

export type StartIdentityVerificationActionResult =
  | {
      success: true;
      data: { kind: "started"; verificationUrl: string };
    }
  | {
      success: true;
      data: { kind: "already_verified" };
    }
  | {
      success: false;
      error: string;
      code: IdentityVerificationActionErrorCode;
    };

function errorCode(error: unknown): IdentityVerificationActionErrorCode {
  if (error instanceof IdentityVerificationError) {
    if (error.code === "unauthorized") return "unauthorized";
    if (error.code === "forbidden") return "forbidden";
    if (error.code === "temporary") return "temporary";
    return "generic";
  }

  if (error instanceof ApiClientError) {
    if (error.status === 401) return "unauthorized";
    if (error.status === 403) return "forbidden";
    if (error.status >= 500 || error.status === 408) return "temporary";
  }

  return "generic";
}

function errorMessage(code: IdentityVerificationActionErrorCode): string {
  if (code === "unauthorized") {
    return t.onboarding.identityVerification.errorSessionExpired;
  }
  if (code === "forbidden") {
    return t.onboarding.identityVerification.errorIneligible;
  }
  if (code === "temporary") {
    return t.onboarding.identityVerification.errorTemporary;
  }
  return t.onboarding.identityVerification.errorGeneric;
}

export async function startIdentityVerificationAction(): Promise<StartIdentityVerificationActionResult> {
  try {
    const result = await startIdentityVerification(
      new ApiIdentityVerificationRepository(),
      new ApiUserRepository(),
    );
    if (result.kind === "already_verified") {
      return { success: true, data: { kind: "already_verified" } };
    }
    return {
      success: true,
      data: { kind: "started", verificationUrl: result.verificationUrl },
    };
  } catch (error: unknown) {
    const code = errorCode(error);
    return { success: false, code, error: errorMessage(code) };
  }
}
