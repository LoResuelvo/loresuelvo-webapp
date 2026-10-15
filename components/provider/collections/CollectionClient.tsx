"use client";

import { useEffect, useRef, useState } from "react";
import type { StatisticsQuery } from "@/domain/provider/statistics-query";
import type { CollectionActionResult } from "@/app/prestador/mi-desempeno/cobros/actions";
import { getProviderCollectionsAction } from "@/app/prestador/mi-desempeno/cobros/actions";
import { t } from "@/infrastructure/i18n/translations";
import { StatisticsFilters } from "../statistics/StatisticsFilters";
import type { CollectionTransactionsActionResult } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { CollectionDetailClient } from "./CollectionDetailClient";
import { CollectionView } from "./CollectionView";
import { StatisticsError } from "../statistics/StatisticsError";
import { StatisticsLoading } from "../statistics/StatisticsLoading";

export function CollectionClient({ initialResult, initialDetail }: { initialResult: CollectionActionResult; initialDetail?: CollectionTransactionsActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState(false);
  const lastQuery = useRef<StatisticsQuery | undefined>(undefined);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);

  async function apply(query?: StatisticsQuery) {
    lastQuery.current = query;
    const request = ++sequence.current;
    setPending(true);
    try {
      const next = await getProviderCollectionsAction(query);
      if (request === sequence.current) setResult(next);
    } catch {
      if (request === sequence.current) setResult({ success: false, error: t.providerCollections.error });
    } finally {
      if (request === sequence.current) setPending(false);
    }
  }
  return <div className="space-y-6" aria-busy={pending}>
    {result.success && <StatisticsFilters key={`${result.data.period.from}|${result.data.period.to}|${result.data.period.granularity}|${Boolean(result.data.comparison)}`} period={result.data.period} pending={pending} comparison={Boolean(result.data.comparison)} title={t.providerCollections.filters} onApply={apply} />}
    <StatisticsLoading message={t.providerCollections.loading} pending={pending} />
    {result.success ? <>
      <CollectionView collections={result.data} />
      <CollectionDetailClient key={`${result.data.period.from}|${result.data.period.to}`} period={result.data.period} initialResult={initialResult.success && initialResult.data.period.from === result.data.period.from && initialResult.data.period.to === result.data.period.to ? initialDetail : undefined} />
    </> : <StatisticsError
      error={result.error}
      pending={pending}
      retryLabel={t.providerCollections.retry}
      onRetry={() => apply(lastQuery.current)}
    />}
  </div>;
}
