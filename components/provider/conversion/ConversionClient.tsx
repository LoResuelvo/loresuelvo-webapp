"use client";

import { useState } from "react";
import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import { getProviderConversionAction } from "@/app/prestador/mi-desempeno/conversion/actions";
import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
import { ConversionFilters } from "./ConversionFilters";
import { ConversionFunnel } from "./ConversionFunnel";

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
          {t.providerConversion.retry}
        </Button>
      </div>
    </div>
  );
}

export function ConversionClient({
  initialResult,
  initialPending = false,
  getConversionAction = getProviderConversionAction,
}: ConversionClientProps) {
  const [result, setResult] = useState<ConversionActionResult | undefined>(initialResult);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [lastQuery, setLastQuery] = useState<ConversionQuery | undefined>(undefined);

  const handleApply = async (query: ConversionQuery) => {
    setIsPending(true);
    setLastQuery(query);
    try {
      const response = await getConversionAction(query);
      setResult(response);
    } catch {
      setResult({ success: false, error: t.providerConversion.error });
    } finally {
      setIsPending(false);
    }
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      setResult(await getConversionAction(lastQuery));
    } catch {
      setResult({ success: false, error: t.providerConversion.error });
    } finally {
      setIsRetrying(false);
    }
  };

  if (initialPending || !result) {
    return <ConversionLoading />;
  }

  if (!result.success) {
    return (
      <ConversionErrorView
        error={result.error}
        isRetrying={isRetrying}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConversionFilters
        period={result.data.period}
        pending={isPending}
        onApply={handleApply}
      />
      <ConversionFunnel data={result.data} />
    </div>
  );
}
