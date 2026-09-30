import type { ProviderCollectionRepository } from "@/ports/provider/provider-collection-repository";
import { validateStatisticsQuery, type StatisticsQuery } from "@/domain/provider/statistics-query";

export async function getProviderCollections(repository: ProviderCollectionRepository, query: StatisticsQuery = {}) {
  return repository.getCollections(validateStatisticsQuery(query));
}
