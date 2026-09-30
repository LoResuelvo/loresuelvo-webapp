import { api } from "@/infrastructure/api/base-client";
import type { ProviderActivityRepository } from "@/ports/provider/provider-activity-repository";
import { mapProviderActivity } from "./activity-mapper";
import type { ActivityQuery } from "@/domain/provider/activity-query";

export function activityEndpoint(query: ActivityQuery): string {
  const params = new URLSearchParams();
  if (query.from !== undefined) params.set("from", query.from);
  if (query.to !== undefined) params.set("to", query.to);
  if (query.granularity !== undefined) params.set("granularity", query.granularity);
  if (query.comparePrevious !== undefined) params.set("compare_previous", String(query.comparePrevious));
  return `/providers/me/statistics/activity${params.size ? `?${params}` : ""}`;
}

export class ApiProviderActivityRepository implements ProviderActivityRepository {
  async getActivity(query: ActivityQuery) {
    const activity = mapProviderActivity(await api.get<unknown>(activityEndpoint(query)));
    if (query.comparePrevious && !activity.comparison) throw new Error("Missing requested comparison");
    return activity;
  }
}
