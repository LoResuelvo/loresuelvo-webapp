"use client";

import { useEffect, useRef, useState } from "react";
import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import { getProviderConversionAction } from "@/app/prestador/mi-desempeno/conversion/actions";
import { t } from "@/infrastructure/i18n/translations";
import { StatisticsError } from "../statistics/StatisticsError";
import { StatisticsLoading } from "../statistics/StatisticsLoading";
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
    <div aria-busy="true">
      <StatisticsLoading message={t.providerConversion.loading} />
    </div>
  );
}

function ConversionErrorView({
  error,
  query,
  pending,
  onRetry,
}: {
  readonly error: string;
  readonly query?: ConversionQuery;
  readonly pending: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <StatisticsError
      error={error}
      pending={pending}
      retryLabel={t.providerConversion.retry}
      onRetry={onRetry}
    >
      {query?.from && query?.to && (
        <p data-testid="conversion-failed-range" className="text-slate-600">
          {statisticsRange(query.from, query.to)}
        </p>
      )}
    </StatisticsError>
  );
}

function useConversionState({
  initialResult,
  getConversionAction = getProviderConversionAction,
}: ConversionClientProps) {
  const [result, setResult] = useState<ConversionActionResult | undefined>(initialResult);
  const [pending, setPending] = useState(false);
  const [lastQuery, setLastQuery] = useState<ConversionQuery | undefined>(undefined);
  const requestSequence = useRef(0);
  const pendingRequest = useRef(false);
  useEffect(() => () => { requestSequence.current += 1; }, []);

  const executeQuery = async (query?: ConversionQuery) => {
    const request = ++requestSequence.current;
    pendingRequest.current = true;
    setPending(true);
    try {
      const response = await getConversionAction(query);
      if (request === requestSequence.current) setResult(response);
    } catch {
      if (request === requestSequence.current) {
        setResult({ success: false, error: t.providerConversion.error });
      }
    } finally {
      if (request === requestSequence.current) {
        pendingRequest.current = false;
        setPending(false);
      }
    }
  };

  const handleApply = async (query: ConversionQuery) => {
    setLastQuery(query);
    await executeQuery(query);
  };

  const handleRetry = async () => {
    if (pendingRequest.current) return;
    await executeQuery(lastQuery);
  };

  return { result, pending, lastQuery, handleApply, handleRetry };
}

export function ConversionClient(props: ConversionClientProps) {
  const { result, pending, lastQuery, handleApply, handleRetry } = useConversionState(props);
  const busy = pending || Boolean(props.initialPending) || !result;

  if (props.initialPending || !result) {
    return (
      <div aria-busy={busy}>
        <StatisticsLoading message={t.providerConversion.loading} pending={busy} />
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="space-y-6" aria-busy={busy}>
        <StatisticsLoading message={t.providerConversion.loading} pending={pending} />
        <ConversionErrorView
          error={result.error}
          query={lastQuery}
          pending={pending}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={busy}>
      <StatisticsLoading message={t.providerConversion.loading} pending={pending} />
      {/* Keep the filters available so a newer query can supersede an in-flight request. */}
      <ConversionFilters
        period={result.data.period}
        pending={false}
        onApply={handleApply}
      />
      <ConversionFunnel data={result.data} />
    </div>
  );
}
