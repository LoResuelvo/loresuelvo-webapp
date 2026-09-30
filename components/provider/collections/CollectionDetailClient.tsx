"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionPurpose, CollectionTransactions } from "@/domain/provider/collection-transactions";
import type { CollectionTransactionQuery } from "@/domain/provider/collection-transaction-query";
import type { CollectionTransactionsActionResult } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { getProviderCollectionTransactionsAction } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { t } from "@/infrastructure/i18n/translations";
import { CollectionTransactions as DetailView } from "./CollectionTransactions";

function CollectionDetailError({ error, pending, hasCursor, onRetry, onReset }: { error: string; pending: boolean; hasCursor: boolean; onRetry: () => void; onReset: () => void }) {
  return (
    <section aria-labelledby="collection-detail-error-title" className="space-y-3">
      <h2 id="collection-detail-error-title" className="text-xl font-semibold">{t.providerCollections.detail}</h2>
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 space-y-3">
        <p>{error}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onRetry}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-secondary"
          >
            {t.providerCollections.retry}
          </button>
          {hasCursor && (
            <button
              type="button"
              disabled={pending}
              onClick={onReset}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-300 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-secondary"
            >
              {t.providerCollections.firstPage}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function CollectionDetailClient({ period, initialResult }: { period: CollectionTransactions["period"]; initialResult?: CollectionTransactionsActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [purpose, setPurpose] = useState<CollectionPurpose | undefined>();
  const [pending, setPending] = useState(!initialResult);
  const sequence = useRef(0);
  const { from, to } = period;
  const lastQuery = useRef<CollectionTransactionQuery>({ from, to, ...(purpose ? { purpose } : {}) });

  const execute = useCallback(async (query: CollectionTransactionQuery) => {
    lastQuery.current = query;
    const request = ++sequence.current;
    setPending(true);
    try {
      const next = await getProviderCollectionTransactionsAction(query);
      if (request === sequence.current) {
        setResult(next);
        setPurpose(query.purpose);
      }
    } catch {
      if (request === sequence.current) setResult({ success: false, error: t.providerCollections.detailError });
    } finally {
      if (request === sequence.current) setPending(false);
    }
  }, []);

  const applyPurpose = useCallback((nextPurpose?: CollectionPurpose) => execute({ from, to, ...(nextPurpose ? { purpose: nextPurpose } : {}) }), [execute, from, to]);
  const applyNextPage = useCallback(() => (result?.success && result.data.nextCursor ? execute({ from, to, ...(purpose ? { purpose } : {}), cursor: result.data.nextCursor }) : undefined), [execute, from, to, purpose, result]);
  const retry = useCallback(() => execute(lastQuery.current), [execute]);
  const resetToFirstPage = useCallback(() => {
    const firstPageQuery = { ...lastQuery.current };
    delete firstPageQuery.cursor;
    return execute(firstPageQuery);
  }, [execute]);

  useEffect(() => {
    if (!initialResult) void applyPurpose();
    return () => { sequence.current += 1; };
  }, [initialResult, applyPurpose]);

  return <div className="space-y-3" aria-busy={pending}>
    <p role="status" className="text-sm">{pending ? t.providerCollections.detailLoading : ""}</p>
    {result?.success ? <DetailView detail={result.data} purpose={purpose} pending={pending} onPurpose={applyPurpose} onNextPage={result.data.nextCursor ? applyNextPage : undefined} />
      : result ? <CollectionDetailError error={result.error} pending={pending} hasCursor={Boolean(lastQuery.current.cursor)} onRetry={retry} onReset={resetToFirstPage} />
      : null}
  </div>;
}
