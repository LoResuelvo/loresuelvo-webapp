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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function buenosAiresDay(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

interface ConversionFiltersProps {
  readonly period: ConversionPeriod;
  readonly pending: boolean;
  readonly onApply: (query: ConversionQuery) => void;
  readonly title?: string;
}

function useConversionFilterState(period: ConversionPeriod) {
  const initialFrom = buenosAiresDay(period.from);
  const initialThrough = buenosAiresDay(new Date(Date.parse(period.to) - 1).toISOString());
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-end">
      <label className="space-y-1 text-sm font-medium text-slate-700">
        {labels.from}
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          aria-describedby="conversion-filter-help"
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-700">
        {labels.through}
        <Input
          type="date"
          value={through}
          onChange={(e) => onThroughChange(e.target.value)}
          aria-describedby="conversion-filter-help"
        />
      </label>
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
      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
    >
      <fieldset disabled={!ready || pending} className="space-y-3">
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
