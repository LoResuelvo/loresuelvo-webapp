import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import type { ProviderReputationRepository } from "@/ports/provider/provider-reputation-repository";

export async function getProviderReputation(
  repository: ProviderReputationRepository,
  query?: ReputationQuery
): Promise<ProviderReputation> {
  return repository.getReputation(query);
}
