import type { ClaimAcknowledgment, ClaimSubmission, ClaimListCriteria, ClaimPage, ClaimDetail } from "@/domain/claim/types";
export interface ClaimRepository {
  submit(input: ClaimSubmission, idempotencyKey: string): Promise<ClaimAcknowledgment>;
  getById(id: number): Promise<ClaimDetail>;
  list(criteria: ClaimListCriteria): Promise<ClaimPage>;
}
