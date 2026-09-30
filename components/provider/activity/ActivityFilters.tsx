import type { ActivityPeriod } from "@/domain/provider/activity";
import type { ActivityQuery } from "@/domain/provider/activity-query";
import { t } from "@/infrastructure/i18n/translations";
import { StatisticsFilters } from "../statistics/StatisticsFilters";

export function ActivityFilters(props: { period: ActivityPeriod; pending: boolean; comparison: boolean; onApply: (query: ActivityQuery) => void }) {
  return <StatisticsFilters {...props} title={t.providerActivity.filters} />;
}
