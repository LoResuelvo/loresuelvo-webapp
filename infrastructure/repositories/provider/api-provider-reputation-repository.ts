import { api } from "@/infrastructure/api/base-client";
import type { ProviderReputationRepository } from "@/ports/provider/provider-reputation-repository";
import { mapProviderReputation } from "./reputation-mapper";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import type { ProviderReputation } from "@/domain/provider/reputation";

export function reputationEndpoint(query?: ReputationQuery): string {
  const params = new URLSearchParams();
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.cursor !== undefined) params.set("cursor", query.cursor);
  return `/providers/me/statistics/reputation${params.size ? `?${params}` : ""}`;
}

export class ApiProviderReputationRepository implements ProviderReputationRepository {
  async getReputation(query?: ReputationQuery): Promise<ProviderReputation> {
    const raw = await api.get<unknown>(reputationEndpoint(query));
    return mapProviderReputation(raw);
  }
}
