"use client";

import { useState, type FormEvent } from "react";
import type { ActivityGranularity, ActivityPeriod } from "@/domain/provider/activity";
import { activityQueryForDays, activityQueryForPeriod, type ActivityQuery } from "@/domain/provider/activity-query";
import { t } from "@/infrastructure/i18n/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function buenosAiresDay(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

export function ActivityFilters({ period, pending, onApply }: { period: ActivityPeriod; pending: boolean; onApply: (query: ActivityQuery) => void }) {
  const initialFrom = buenosAiresDay(period.from);
  const initialThrough = buenosAiresDay(new Date(Date.parse(period.to) - 1).toISOString());
  const [from, setFrom] = useState(initialFrom);
  const [through, setThrough] = useState(initialThrough);
  const [granularity, setGranularity] = useState<ActivityGranularity>(period.granularity);
  const [error, setError] = useState<string | null>(null);
  const labels = t.providerActivity;

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const query = from === initialFrom && through === initialThrough
        ? { ...activityQueryForPeriod(period), granularity }
        : activityQueryForDays(from, through, granularity);
      setError(null);
      onApply(query);
    } catch {
      setError(labels.invalidRange);
    }
  }

  return (
    <form onSubmit={apply} aria-label={labels.filters} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <legend className="sr-only">{labels.filters}</legend>
        <label className="space-y-1 text-sm">{labels.from}<Input type="date" required value={from} onChange={event => setFrom(event.target.value)} aria-describedby="activity-filter-help" /></label>
        <label className="space-y-1 text-sm">{labels.through}<Input type="date" required value={through} onChange={event => setThrough(event.target.value)} aria-describedby="activity-filter-help" /></label>
        <label className="space-y-1 text-sm">{labels.granularity}<select value={granularity} onChange={event => setGranularity(event.target.value as ActivityGranularity)} className="block w-full rounded-lg border border-slate-300 h-8 px-2 focus-visible:outline-2 focus-visible:outline-brand-secondary">
          {(["day", "week", "month"] as const).map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </select></label>
        <Button type="submit" variant="brand">{labels.apply}</Button>
      </fieldset>
      <p id="activity-filter-help" className="text-xs text-slate-600">{labels.filterHelp}</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}
