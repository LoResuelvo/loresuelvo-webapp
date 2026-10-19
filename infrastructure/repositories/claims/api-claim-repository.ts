import { api } from "@/infrastructure/api/base-client";
import type { ApiClaimAcknowledgment } from "@/infrastructure/api/types";
import type { ClaimSubmission } from "@/domain/claim/types";
import type { ClaimRepository } from "@/ports/claims/claim-repository";
import { mapClaimAcknowledgment, toApiClaimSubmission } from "./claim-mapper";
export class ApiClaimRepository implements ClaimRepository {
  async submit(input: ClaimSubmission, idempotencyKey: string) {
    const dto = await api.post<ApiClaimAcknowledgment>("/claims", toApiClaimSubmission(input), {"Idempotency-Key":idempotencyKey});
    return mapClaimAcknowledgment(dto);
  }
}
