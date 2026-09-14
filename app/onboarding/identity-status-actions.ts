"use server";

import { ApiClientError } from "@/infrastructure/api/base-client";
import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";
import type { ProviderCurrentUser } from "@/domain/user/types";
import { t } from "@/infrastructure/i18n/translations";
import { ApiUserRepository } from "@/infrastructure/repositories/onboarding/api-user-repository";

export type IdentityVerificationStatusReadErrorCode =
  | "unauthorized"
  | "forbidden"
  | "temporary"
  | "generic";

export type ReadIdentityVerificationStatusActionResult =
  | { success: true; data: { status: IdentityVerificationStatus } }
  | {
      success: false;
      error: string;
      code: IdentityVerificationStatusReadErrorCode;
    };

function errorCode(error: unknown): IdentityVerificationStatusReadErrorCode {
  if (error instanceof IdentityVerificationError) {
    return "generic";
  }

  if (error instanceof ApiClientError) {
    if (error.status === 401) return "unauthorized";
    if (error.status === 403) return "forbidden";
    if (error.status === 408 || error.status >= 500) return "temporary";
  }

  return "generic";
}

function errorMessage(
  code: IdentityVerificationStatusReadErrorCode,
): string {
  if (code === "unauthorized") {
    return t.onboarding.identityVerification.errorSessionExpired;
  }
  if (code === "forbidden") {
    return t.onboarding.identityVerification.errorIneligible;
  }
  if (code === "temporary") {
    return t.onboarding.identityVerification.errorTemporary;
  }
  return t.onboarding.identityVerification.errorRead;
}

export async function readIdentityVerificationStatusAction(): Promise<ReadIdentityVerificationStatusActionResult> {
  try {
    const currentUser = await new ApiUserRepository().getCurrentUser();
    if (currentUser.role !== "provider") {
      return {
        success: false,
        code: "forbidden",
        error: errorMessage("forbidden"),
      };
    }

    const provider = currentUser as ProviderCurrentUser;
    return {
      success: true,
      data: { status: provider.identityVerificationStatus },
    };
  } catch (error: unknown) {
    const code = errorCode(error);
    return { success: false, code, error: errorMessage(code) };
  }
}
