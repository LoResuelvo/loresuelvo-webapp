import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";

export interface ProviderReputationRepository {
  getReputation(query?: ReputationQuery): Promise<ProviderReputation>;
}
