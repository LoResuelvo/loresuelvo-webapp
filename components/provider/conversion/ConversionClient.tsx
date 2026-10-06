"use client";

import { useRef, useState } from "react";
import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import { getProviderConversionAction } from "@/app/prestador/mi-desempeno/conversion/actions";
import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
import { ConversionFilters } from "./ConversionFilters";
import { ConversionFunnel } from "./ConversionFunnel";

import { statisticsRange } from "../statistics/statistics-format";

export type ConversionActionResult =
  | { success: true; data: ProviderConversion }
  | { success: false; error: string };

interface ConversionClientProps {
  readonly initialResult?: ConversionActionResult;
  readonly initialPending?: boolean;
  readonly getConversionAction?: (query?: ConversionQuery) => Promise<ConversionActionResult>;
}

export function ConversionLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600"
    >
      {t.providerConversion.loading}
    </div>
  );
}

function ConversionErrorView({
  error,
  query,
  isRetrying,
  onRetry,
}: {
  readonly error: string;
  readonly query?: ConversionQuery;
  readonly isRetrying: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 p-4 space-y-3 text-sm text-red-700">
      <p>{error}</p>
      {query?.from && query?.to && (
        <p data-testid="conversion-failed-range" className="text-slate-600">
          {statisticsRange(query.from, query.to)}
        </p>
      )}
      <div>
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          variant="outline"
        >
          {t.providerConversion.retry}
        </Button>
      </div>
    </div>
  );
}

function useConversionState({
  initialResult,
  getConversionAction = getProviderConversionAction,
}: ConversionClientProps) {
  const [result, setResult] = useState<ConversionActionResult | undefined>(initialResult);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastQuery, setLastQuery] = useState<ConversionQuery | undefined>(undefined);
  const requestSeqRef = useRef(0);

  const executeQuery = async (query?: ConversionQuery) => {
    const seq = ++requestSeqRef.current;
    try {
      const response = await getConversionAction(query);
      if (seq === requestSeqRef.current) setResult(response);
    } catch {
      if (seq === requestSeqRef.current) {
        setResult({ success: false, error: t.providerConversion.error });
      }
    }
  };

  const handleApply = async (query: ConversionQuery) => {
    setLastQuery(query);
    await executeQuery(query);
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await executeQuery(lastQuery);
    } finally {
      setIsRetrying(false);
    }
  };

  return { result, isRetrying, lastQuery, handleApply, handleRetry };
}

export function ConversionClient(props: ConversionClientProps) {
  const { result, isRetrying, lastQuery, handleApply, handleRetry } = useConversionState(props);

  if (props.initialPending || !result) {
    return <ConversionLoading />;
  }

  if (!result.success) {
    return (
      <ConversionErrorView
        error={result.error}
        query={lastQuery}
        isRetrying={isRetrying}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConversionFilters
        period={result.data.period}
        pending={false}
        onApply={handleApply}
      />
      <ConversionFunnel data={result.data} />
    </div>
  );
}
