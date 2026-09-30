"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollectionPurpose, CollectionTransactions } from "@/domain/provider/collection-transactions";
import type { CollectionTransactionsActionResult } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { getProviderCollectionTransactionsAction } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { t } from "@/infrastructure/i18n/translations";
import { CollectionTransactions as DetailView } from "./CollectionTransactions";

export function CollectionDetailClient({ period, initialResult }: { period: CollectionTransactions["period"]; initialResult?: CollectionTransactionsActionResult }) {
  const [result, setResult] = useState(initialResult);
  const [purpose, setPurpose] = useState<CollectionPurpose | undefined>();
  const [pending, setPending] = useState(!initialResult);
  const sequence = useRef(0);
  const { from, to } = period;

  const applyPurpose = useCallback(async (nextPurpose?: CollectionPurpose) => {
    const request = ++sequence.current;
    setPending(true);
    try {
      const next = await getProviderCollectionTransactionsAction({ from, to, ...(nextPurpose ? { purpose: nextPurpose } : {}) });
      if (request === sequence.current) { setResult(next); setPurpose(nextPurpose); }
    } catch {
      if (request === sequence.current) setResult({ success: false, error: t.providerCollections.detailError });
    } finally {
      if (request === sequence.current) setPending(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!initialResult) void applyPurpose();
    return () => { sequence.current += 1; };
  }, [initialResult, applyPurpose]);

  return <div className="space-y-3" aria-busy={pending}>
    <p role="status" className="text-sm">{pending ? t.providerCollections.detailLoading : ""}</p>
    {result?.success ? <DetailView detail={result.data} purpose={purpose} pending={pending} onPurpose={applyPurpose} /> : result && <p role="alert">{result.error}</p>}
  </div>;
}
