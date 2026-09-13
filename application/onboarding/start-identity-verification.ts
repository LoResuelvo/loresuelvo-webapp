import { IdentityVerificationError } from "@/domain/identity-verification/errors";
import { isIdentityVerified } from "@/domain/identity-verification/types";
import type { ProviderCurrentUser } from "@/domain/user/types";
import type { IdentityVerificationRepository } from "@/ports/onboarding/identity-verification-repository";
import type { UserRepository } from "@/ports/onboarding/user-repository";

export type StartIdentityVerificationResult =
  | { kind: "started"; verificationUrl: string }
  | { kind: "already_verified" };

export async function startIdentityVerification(
  identityVerificationRepository: IdentityVerificationRepository,
  currentUserReader: Pick<UserRepository, "getCurrentUser">,
): Promise<StartIdentityVerificationResult> {
  try {
    const session = await identityVerificationRepository.startSession();
    return { kind: "started", verificationUrl: session.verificationUrl };
  } catch (error: unknown) {
    if (
      !(error instanceof IdentityVerificationError) ||
      error.code !== "conflict"
    ) {
      throw error;
    }

    const currentUser = await currentUserReader.getCurrentUser();
    if (
      currentUser.role === "provider" &&
      isIdentityVerified(
        (currentUser as ProviderCurrentUser).identityVerificationStatus,
      )
    ) {
      return { kind: "already_verified" };
    }

    throw error;
  }
}
