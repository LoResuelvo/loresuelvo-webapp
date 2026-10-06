"use client";

import { useState } from "react";
import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import { getProviderReputationAction } from "@/app/prestador/mi-desempeno/reputacion/actions";
import { t } from "@/infrastructure/i18n/translations";
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

export function ReputationClient({
  initialResult,
  initialPending = false,
  getReputationAction = getProviderReputationAction,
}: ReputationClientProps) {
  const [result, setResult] = useState<ReputationActionResult | undefined>(initialResult);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  if (initialPending || !result) {
    return <ReputationLoading />;
  }

  if (!result.success) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {result.error}
      </div>
    );
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
