"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { StatisticsGranularity, StatisticsPeriod } from "@/domain/provider/statistics-period";
import { FutureStatisticsDateError, statisticsQueryForDays, statisticsQueryForPeriod, type StatisticsQuery } from "@/domain/provider/statistics-query";
import { t } from "@/infrastructure/i18n/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function buenosAiresDay(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

export function StatisticsFilters({ period, pending, onApply, comparison, title }: { period: StatisticsPeriod; pending: boolean; onApply: (query: StatisticsQuery) => void; comparison?: boolean; title: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const initialFrom = buenosAiresDay(period.from);
  const initialThrough = buenosAiresDay(new Date(Date.parse(period.to) - 1).toISOString());
  const [from, setFrom] = useState(initialFrom);
  const [through, setThrough] = useState(initialThrough);
  const [granularity, setGranularity] = useState<StatisticsGranularity>(period.granularity);
  const [comparePrevious, setComparePrevious] = useState(comparison ?? false);
  const [error, setError] = useState<string | null>(null);
  const labels = t.providerActivity;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const query = from === initialFrom && through === initialThrough
        ? { ...statisticsQueryForPeriod(period), granularity }
        : statisticsQueryForDays(from, through, granularity);
      setError(null);
      onApply({ ...query, ...(comparison !== undefined ? { comparePrevious } : {}) });
    } catch (error: unknown) {
      setError(error instanceof FutureStatisticsDateError ? labels.futureDate : labels.invalidRange);
    }
  }

  return (
    <form onSubmit={apply} aria-busy={!ready || pending} aria-label={title} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <fieldset disabled={!ready || pending} className="space-y-3">
        <legend className="sr-only">{title}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <label className="space-y-1 text-sm">{labels.from}<Input type="date" required value={from} onChange={event => setFrom(event.target.value)} aria-describedby="statistics-filter-help" /></label>
          <label className="space-y-1 text-sm">{labels.through}<Input type="date" required value={through} onChange={event => setThrough(event.target.value)} aria-describedby="statistics-filter-help" /></label>
          <label className="space-y-1 text-sm">{labels.granularity}<select value={granularity} onChange={event => setGranularity(event.target.value as StatisticsGranularity)} className="block w-full rounded-lg border border-slate-300 h-8 px-2 focus-visible:outline-2 focus-visible:outline-brand-secondary">
            {(["day", "week", "month"] as const).map(value => <option key={value} value={value}>{labels[value]}</option>)}
          </select></label>
          <Button type="submit" variant="brand">{labels.apply}</Button>
        </div>
        {comparison !== undefined && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={comparePrevious} onChange={event => setComparePrevious(event.target.checked)} className="accent-brand-secondary" />{labels.compare}</label>}
      </fieldset>
      <p id="statistics-filter-help" className="text-xs text-slate-600">{labels.filterHelp}</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}
