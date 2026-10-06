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

export function ReputationClient({
  initialResult,
  initialPending = false,
  getReputationAction = getProviderReputationAction,
}: ReputationClientProps) {
  const [result, setResult] = useState<ReputationActionResult | undefined>(initialResult);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const nextResult = await getReputationAction();
      setResult(nextResult);
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

  const handleNextPage = async () => {
    if (!result.data.nextCursor || isLoadingPage) return;
    setIsLoadingPage(true);
    try {
      const nextResult = await getReputationAction({ cursor: result.data.nextCursor });
      if (nextResult.success) {
        setResult(nextResult);
      }
    } finally {
      setIsLoadingPage(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReputationIndicators data={result.data} />
      <ReputationReviewsList
        reviews={result.data.reviews}
        hasNextPage={Boolean(result.data.nextCursor)}
        onNextPage={handleNextPage}
        isLoadingNextPage={isLoadingPage}
      />
    </div>
  );
}
