import type { ProviderActivityRepository } from "@/ports/provider/provider-activity-repository";
import { validateActivityQuery, type ActivityQuery } from "@/domain/provider/activity-query";

export async function getProviderActivity(repository: ProviderActivityRepository, query: ActivityQuery = {}) {
  return repository.getActivity(validateActivityQuery(query));
}
