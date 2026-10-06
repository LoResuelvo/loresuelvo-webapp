"use client";

import { useState } from "react";
import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import { getProviderReputationAction } from "@/app/prestador/mi-desempeno/reputacion/actions";
import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
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
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600"
    >
      {t.providerReputation.loading}
    </div>
  );
}

function ReputationErrorView({
  error,
  isRetrying,
  onRetry,
}: {
  readonly error: string;
  readonly isRetrying: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 p-4 space-y-3 text-sm text-red-700">
      <p>{error}</p>
      <div>
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          variant="outline"
        >
          {t.providerReputation.retry}
        </Button>
      </div>
    </div>
  );
}

function useReputationPagination(
  result: ReputationActionResult | undefined,
  setResult: (r: ReputationActionResult) => void,
  getAction: (query?: ReputationQuery) => Promise<ReputationActionResult>
) {
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);

  const handleNextPage = async () => {
    if (!result || !result.success || !result.data.nextCursor || isLoadingPage) return;
    setIsLoadingPage(true);
    setPaginationError(null);
    try {
      const nextResult = await getAction({ cursor: result.data.nextCursor });
      if (nextResult.success) {
        setResult(nextResult);
      } else {
        setPaginationError(nextResult.error || t.providerReputation.error);
      }
    } catch {
      setPaginationError(t.providerReputation.error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  return { isLoadingPage, paginationError, handleNextPage };
}

export function ReputationClient({
  initialResult,
  initialPending = false,
  getReputationAction = getProviderReputationAction,
}: ReputationClientProps) {
  const [result, setResult] = useState<ReputationActionResult | undefined>(initialResult);
  const [isRetrying, setIsRetrying] = useState(false);
  const { isLoadingPage, paginationError, handleNextPage } = useReputationPagination(
    result,
    setResult,
    getReputationAction
  );

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      setResult(await getReputationAction());
    } catch {
      setResult({ success: false, error: t.providerReputation.error });
    } finally {
      setIsRetrying(false);
    }
  };

  if (initialPending || !result) {
    return <ReputationLoading />;
  }

  if (!result.success) {
    return <ReputationErrorView error={result.error} isRetrying={isRetrying} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      <ReputationIndicators data={result.data} />
      <ReputationReviewsList
        reviews={result.data.reviews}
        hasNextPage={Boolean(result.data.nextCursor)}
        onNextPage={handleNextPage}
        isLoadingNextPage={isLoadingPage}
      />
      {paginationError && (
        <ReputationErrorView
          error={paginationError}
          isRetrying={isLoadingPage}
          onRetry={handleNextPage}
        />
      )}
    </div>
  );
}
