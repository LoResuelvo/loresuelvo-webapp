import { api } from "@/infrastructure/api/base-client";
import type { ApiClaimAcknowledgment, ApiClaimPage, ApiClaimDetail } from "@/infrastructure/api/types";
import type { ClaimSubmission, ClaimListCriteria } from "@/domain/claim/types";
import type { ClaimRepository } from "@/ports/claims/claim-repository";
import { mapClaimAcknowledgment, mapClaimDetail, mapClaimPage, toApiClaimSubmission } from "./claim-mapper";
export class ApiClaimRepository implements ClaimRepository {
  async submit(input: ClaimSubmission, idempotencyKey: string) {
    const dto = await api.post<ApiClaimAcknowledgment>("/claims", toApiClaimSubmission(input), {"Idempotency-Key":idempotencyKey});
    return mapClaimAcknowledgment(dto);
  }
  async getById(id: number) {
    return mapClaimDetail(await api.get<ApiClaimDetail>(`/claims/${id}`));
  }
  async list(criteria: ClaimListCriteria) {
    const query = new URLSearchParams({page:String(criteria.page ?? 1),limit:String(criteria.limit ?? 20)});
    if (criteria.status) query.set("status", criteria.status);
    return mapClaimPage(await api.get<ApiClaimPage>(`/claims?${query}`));
  }
}
