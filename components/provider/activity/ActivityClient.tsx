"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityQuery } from "@/domain/provider/activity-query";
import { activityQueryForPeriod } from "@/domain/provider/activity-query";
import type { ActivityActionResult } from "@/app/prestador/mi-desempeno/actividad/actions";
import { getProviderActivityAction } from "@/app/prestador/mi-desempeno/actividad/actions";
import { t } from "@/infrastructure/i18n/translations";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityView } from "./ActivityView";
import { Button } from "@/components/ui/button";

export function ActivityClient({ initialResult }: { initialResult: ActivityActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);

  async function apply(query: ActivityQuery) {
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
      {result.success && <ActivityFilters key={`${result.data.period.from}|${result.data.period.to}`} period={result.data.period} pending={pending} onApply={apply} />}
      {result.success && <Button disabled={pending} variant="outline" aria-pressed={Boolean(result.data.comparison)} onClick={() => apply({ ...activityQueryForPeriod(result.data.period), comparePrevious: !result.data.comparison })}>{result.data.comparison ? t.providerActivity.stopCompare : t.providerActivity.compare}</Button>}
      <p role="status" className="text-sm">{pending ? t.providerActivity.loading : ""}</p>
      {result.success ? <ActivityView activity={result.data} /> : <p role="alert">{result.error}</p>}
    </div>
  );
}
