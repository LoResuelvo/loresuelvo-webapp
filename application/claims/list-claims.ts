import type { ClaimListCriteria } from "@/domain/claim/types";
import type { ClaimRepository } from "@/ports/claims/claim-repository";

export function isClaimListCriteria(criteria: ClaimListCriteria): boolean {
  if (!criteria || typeof criteria !== "object") return false;
  const { status, page = 1, limit = 20 } = criteria;
  return (status === undefined || ["open", "in_review", "resolved", "dismissed"].includes(status)) &&
    Number.isInteger(page) && page >= 1 && page <= 2147483647 &&
    Number.isInteger(limit) && limit >= 1 && limit <= 100;
}

export async function listClaims(repository: ClaimRepository, criteria: ClaimListCriteria) {
  if (!isClaimListCriteria(criteria)) throw new Error("Invalid claim list criteria");
  return repository.list(criteria);
}
