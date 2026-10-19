import type { ClaimRepository } from "@/ports/claims/claim-repository";

export function isClaimId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}
export async function getClaimDetail(repository: Pick<ClaimRepository, "getById">, id: number) {
  if (!isClaimId(id)) throw new Error("Invalid claim identifier");
  return repository.getById(id);
}
