import type { ProviderActivity } from "@/domain/provider/activity";
import type { ActivityQuery } from "@/domain/provider/activity-query";

export interface ProviderActivityRepository {
  getActivity(query: ActivityQuery): Promise<ProviderActivity>;
}
