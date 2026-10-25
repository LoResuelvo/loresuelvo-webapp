"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ConversionPeriod } from "@/domain/provider/conversion";
import {
  FutureConversionDateError,
  conversionQueryForDays,
  conversionQueryForPeriod,
  type ConversionQuery,
} from "@/domain/provider/conversion-query";
import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
import { StatisticsDateFields } from "../statistics/StatisticsDateFields";
import { statisticsDay } from "../statistics/statistics-format";

interface ConversionFiltersProps {
  readonly period: ConversionPeriod;
  readonly pending: boolean;
  readonly onApply: (query: ConversionQuery) => void;
  readonly title?: string;
}

function useConversionFilterState(period: ConversionPeriod) {
  const initialFrom = statisticsDay(period.from);
  const initialThrough = statisticsDay(new Date(Date.parse(period.to) - 1).toISOString());
  const [from, setFrom] = useState(initialFrom);
  const [through, setThrough] = useState(initialThrough);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFrom(initialFrom);
    setThrough(initialThrough);
  }, [initialFrom, initialThrough]);

  return { from, setFrom, through, setThrough, error, setError, initialFrom, initialThrough };
}

function FilterInputs({
  from,
  through,
  onFromChange,
  onThroughChange,
}: {
  readonly from: string;
  readonly through: string;
  readonly onFromChange: (val: string) => void;
  readonly onThroughChange: (val: string) => void;
}) {
  const labels = t.providerConversion;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-end">
      <StatisticsDateFields from={from} through={through} onFromChange={onFromChange} onThroughChange={onThroughChange} helpId="conversion-filter-help" />
      <Button type="submit" variant="brand">
        {labels.applyFilters}
      </Button>
    </div>
  );
}

export function ConversionFilters({
  period,
  pending,
  onApply,
  title = t.providerConversion.filtersTitle,
}: ConversionFiltersProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const { from, setFrom, through, setThrough, error, setError, initialFrom, initialThrough } =
    useConversionFilterState(period);
  const labels = t.providerConversion;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const query =
        from === initialFrom && through === initialThrough
          ? conversionQueryForPeriod(period)
          : conversionQueryForDays(from, through);
      setError(null);
      onApply(query);
    } catch (err: unknown) {
      setError(err instanceof FutureConversionDateError ? labels.futureDate : labels.invalidRange);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={!ready || pending}
      aria-label={title}
      className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
    >
      <fieldset disabled={!ready || pending} className="space-y-2">
        <legend className="sr-only">{title}</legend>
        <FilterInputs
          from={from}
          through={through}
          onFromChange={setFrom}
          onThroughChange={setThrough}
        />
      </fieldset>
      <p id="conversion-filter-help" className="text-xs text-slate-600">
        {labels.filterHelp}
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}
