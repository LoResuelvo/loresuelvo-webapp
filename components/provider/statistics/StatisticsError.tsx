import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StatisticsErrorProps {
  readonly error: string;
  readonly pending: boolean;
  readonly retryLabel: string;
  readonly onRetry: () => void;
  readonly children?: ReactNode;
}

export function StatisticsError({ error, pending, retryLabel, onRetry, children }: StatisticsErrorProps) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p>{error}</p>
      {children}
      <Button type="button" disabled={pending} variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
