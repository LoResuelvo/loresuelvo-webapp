"use client";

import { useEffect, useRef, useState } from "react";
import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import { getProviderReputationAction } from "@/app/prestador/mi-desempeno/reputacion/actions";
import { t } from "@/infrastructure/i18n/translations";
import { StatisticsError } from "../statistics/StatisticsError";
import { StatisticsLoading } from "../statistics/StatisticsLoading";
import { statisticsDate } from "../statistics/statistics-format";
import { ReputationIndicators } from "./ReputationIndicators";
import { ReputationReviewsList } from "./ReputationReviewsList";

export type ReputationActionResult =
  | { success: true; data: ProviderReputation }
  | { success: false; error: string };

interface ReputationClientProps {
  readonly initialResult?: ReputationActionResult;
  readonly initialPending?: boolean;
  readonly getReputationAction?: (query?: ReputationQuery) => Promise<ReputationActionResult>;
}

export function ReputationLoading() {
  return (
    <div aria-busy="true">
      <StatisticsLoading message={t.providerReputation.loading} />
    </div>
  );
}

function ReputationScope({ data }: { readonly data: ProviderReputation }) {
  return (
    <section aria-labelledby="reputation-scope-title" className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <h2 id="reputation-scope-title" className="font-semibold text-slate-900">{t.providerReputation.scope}</h2>
      <p className="text-sm text-slate-600">{t.providerReputation.scopeHelp}</p>
      <p className="text-xs text-slate-500">
        {t.providerActivity.calculatedAt} {statisticsDate(data.calculatedAt)}
      </p>
    </section>
  );
}

function useReputationState(
  initialResult: ReputationActionResult | undefined,
  getAction: (query?: ReputationQuery) => Promise<ReputationActionResult>
) {
  const [result, setResult] = useState<ReputationActionResult | undefined>(initialResult);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const requestPending = useRef(false);
  const lastPageQuery = useRef<ReputationQuery | undefined>(undefined);
  useEffect(() => () => { requestSequence.current += 1; }, []);

  const beginRequest = () => {
    if (requestPending.current) return undefined;
    requestPending.current = true;
    return ++requestSequence.current;
  };

  const finishRequest = (request: number, setPending: (pending: boolean) => void) => {
    if (request !== requestSequence.current) return;
    requestPending.current = false;
    setPending(false);
  };

  const handleRetry = async () => {
    const request = beginRequest();
    if (request === undefined) return;
    setIsRetrying(true);
    try {
      const nextResult = await getAction();
      if (request === requestSequence.current) setResult(nextResult);
    } catch {
      if (request === requestSequence.current) {
        setResult({ success: false, error: t.providerReputation.error });
      }
    } finally {
      finishRequest(request, setIsRetrying);
    }
  };

  const loadPage = async (query: ReputationQuery) => {
    const request = beginRequest();
    if (request === undefined) return;
    lastPageQuery.current = query;
    setIsLoadingPage(true);
    setPaginationError(null);
    try {
      const nextResult = await getAction(query);
      if (request !== requestSequence.current) return;
      if (nextResult.success) {
        setResult(nextResult);
      } else {
        setPaginationError(nextResult.error || t.providerReputation.error);
      }
    } catch {
      if (request === requestSequence.current) {
        setPaginationError(t.providerReputation.error);
      }
    } finally {
      finishRequest(request, setIsLoadingPage);
    }
  };

  const handleNextPage = async () => {
    if (!result?.success || !result.data.nextCursor) return;
    await loadPage({ cursor: result.data.nextCursor });
  };

  const retryNextPage = async () => {
    const query = lastPageQuery.current;
    if (!query) return;
    await loadPage(query);
  };

  return { result, isRetrying, isLoadingPage, paginationError, handleRetry, handleNextPage, retryNextPage };
}

export function ReputationClient({
  initialResult,
  initialPending = false,
  getReputationAction = getProviderReputationAction,
}: ReputationClientProps) {
  const {
    result,
    isRetrying,
    isLoadingPage,
    paginationError,
    handleRetry,
    handleNextPage,
    retryNextPage,
  } = useReputationState(initialResult, getReputationAction);

  const pending = initialPending || !result || isRetrying || isLoadingPage;
  const loading = <StatisticsLoading message={t.providerReputation.loading} pending={pending} />;

  if (initialPending || !result) {
    return <div aria-busy={pending}>{loading}</div>;
  }

  if (!result.success) {
    return (
      <div className="space-y-6" aria-busy={pending}>
        {loading}
        <StatisticsError
          error={result.error}
          pending={pending}
          retryLabel={t.providerReputation.retry}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={pending}>
      {loading}
      <ReputationIndicators data={result.data} />
      <ReputationScope data={result.data} />
      <ReputationReviewsList
        reviews={result.data.reviews}
        hasNextPage={Boolean(result.data.nextCursor)}
        onNextPage={handleNextPage}
        isLoadingNextPage={isLoadingPage}
      />
      {paginationError && (
        <StatisticsError
          error={paginationError}
          pending={isLoadingPage}
          retryLabel={t.providerReputation.retry}
          onRetry={retryNextPage}
        />
      )}
    </div>
  );
}
