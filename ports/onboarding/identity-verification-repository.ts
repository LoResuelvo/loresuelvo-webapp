import type { IdentityVerificationSession } from "@/domain/identity-verification/types";

export interface IdentityVerificationRepository {
  startSession(): Promise<IdentityVerificationSession>;
}
