import type { ClaimSubmission } from "@/domain/claim/types";
import { isClaimUuid, normalizeClaimSubmission } from "@/domain/claim/validation";
import type { ClaimRepository } from "@/ports/claims/claim-repository";
export async function submitClaim(repository: ClaimRepository, input: ClaimSubmission, idempotencyKey: string) {
  if (!isClaimUuid(idempotencyKey)) throw new Error("Invalid claim submission key");
  return repository.submit(normalizeClaimSubmission(input), idempotencyKey);
}
