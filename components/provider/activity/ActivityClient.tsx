"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityQuery } from "@/domain/provider/activity-query";
import type { ActivityActionResult } from "@/app/prestador/mi-desempeno/actividad/actions";
import { getProviderActivityAction } from "@/app/prestador/mi-desempeno/actividad/actions";
import { t } from "@/infrastructure/i18n/translations";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityView } from "./ActivityView";
import { StatisticsError } from "../statistics/StatisticsError";
import { StatisticsLoading } from "../statistics/StatisticsLoading";

export function ActivityClient({ initialResult }: { initialResult: ActivityActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState(false);
  const lastQuery = useRef<ActivityQuery | undefined>(undefined);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);

  async function apply(query?: ActivityQuery) {
    lastQuery.current = query;
    const request = ++sequence.current;
    setPending(true);
    try {
      const next = await getProviderActivityAction(query);
      if (request === sequence.current) setResult(next);
    } catch {
      if (request === sequence.current) setResult({ success: false, error: t.providerActivity.error });
    } finally {
      if (request === sequence.current) setPending(false);
    }
  }

  return (
    <div className="space-y-6" aria-busy={pending}>
      {result.success && <ActivityFilters key={`${result.data.period.from}|${result.data.period.to}|${result.data.period.granularity}|${Boolean(result.data.comparison)}`} comparison={Boolean(result.data.comparison)} period={result.data.period} pending={pending} onApply={apply} />}
      <StatisticsLoading message={t.providerActivity.loading} pending={pending} />
      {result.success ? <ActivityView activity={result.data} /> : (
        <StatisticsError
          error={result.error}
          pending={pending}
          retryLabel={t.providerActivity.retry}
          onRetry={() => apply(lastQuery.current)}
        />
      )}
    </div>
  );
}
