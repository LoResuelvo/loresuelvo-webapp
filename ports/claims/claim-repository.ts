import type { ClaimAcknowledgment, ClaimSubmission } from "@/domain/claim/types";
export interface ClaimRepository {
  submit(input: ClaimSubmission, idempotencyKey: string): Promise<ClaimAcknowledgment>;
}
