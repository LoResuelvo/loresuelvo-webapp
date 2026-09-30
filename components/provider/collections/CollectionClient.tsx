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

export function CollectionClient({ initialResult, initialDetail }: { initialResult: CollectionActionResult; initialDetail?: CollectionTransactionsActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);

  async function apply(query: StatisticsQuery) {
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
    <p role="status" className="text-sm">{pending ? t.providerCollections.loading : ""}</p>
    {result.success ? <>
      <CollectionView collections={result.data} />
      <CollectionDetailClient key={`${result.data.period.from}|${result.data.period.to}`} period={result.data.period} initialResult={initialResult.success && initialResult.data.period.from === result.data.period.from && initialResult.data.period.to === result.data.period.to ? initialDetail : undefined} />
    </> : <p role="alert">{result.error}</p>}
  </div>;
}
