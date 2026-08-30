"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPaymentIntentAction,
  type GetPaymentIntentResult,
} from "@/app/consumidor/pagos/actions";
import { parseActivePayment, resolvePaymentIntentId } from "@/lib/payment-utils";
import type { ActivePayment } from "@/domain/payment/types";
import { usePaymentIntentPolling } from "./usePaymentIntentPolling";
import { PaymentSuccessView } from "./PaymentSuccessView";
import { PaymentErrorView } from "./PaymentErrorView";
import { PaymentPendingView } from "./PaymentPendingView";
import { resolvePaymentViewState } from "./payment-view-state";

export type PaymentReturnKind = "success" | "pending" | "failure";

export interface PaymentResultStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export interface PaymentResultPageProps {
  returnKind: PaymentReturnKind;
  search?: string;
  storage?: PaymentResultStorage;
  getPaymentIntent?: (paymentIntentId: string) => Promise<GetPaymentIntentResult>;
}

export function PaymentResultPage({
  returnKind,
  search,
  storage,
  getPaymentIntent = getPaymentIntentAction,
}: PaymentResultPageProps) {
  const router = useRouter();
  const [paymentStorage, setPaymentStorage] = useState<PaymentResultStorage | null>(storage ?? null);
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(() =>
    storage ? parseActivePayment(storage.getItem("activePayment")) : null,
  );
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(() =>
    storage ? resolvePaymentIntentId(search ?? "", storage.getItem("activePayment")) : null,
  );
  const [hasResolvedPaymentIntent, setHasResolvedPaymentIntent] = useState(Boolean(storage));

  useEffect(() => {
    const resolvedStorage = storage ?? window.sessionStorage;
    setPaymentStorage(resolvedStorage);
    const rawActivePayment = resolvedStorage.getItem("activePayment");
    setActivePayment(parseActivePayment(rawActivePayment));
    setPaymentIntentId(resolvePaymentIntentId(search ?? window.location.search, rawActivePayment));
    setHasResolvedPaymentIntent(true);
  }, [search, storage]);

  const handlePaid = useCallback(() => {
    paymentStorage?.removeItem("activePayment");
    router.refresh();
  }, [paymentStorage, router]);

  const polling = usePaymentIntentPolling({
    paymentIntentId,
    getPaymentIntent,
    onPaid: handlePaid,
  });

  const state = resolvePaymentViewState(
    returnKind,
    hasResolvedPaymentIntent,
    paymentIntentId,
    polling,
    activePayment,
  );

  const isServiceBalance = activePayment?.purpose === "service_balance";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/70 px-4 py-8 sm:py-12">
      <Card
        className="w-full max-w-md sm:max-w-lg rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 p-6 sm:p-8"
        aria-live="polite"
        aria-busy={polling.isLoading}
      >
        <CardContent className="flex flex-col items-center gap-6 p-0 text-center">
          {state.kind === "success" && (
            <PaymentSuccessView isServiceBalance={isServiceBalance} />
          )}
          {state.kind === "error" && (
            <PaymentErrorView
              title={state.title}
              description={state.description}
              variant={state.variant}
              icon={state.icon}
              isServiceBalance={isServiceBalance}
              canRetryVerification={state.canRetryVerification}
              canRetryPayment={state.canRetryPayment}
              isUnauthorized={state.isUnauthorized}
              onRetryVerification={polling.retry}
            />
          )}
          {state.kind === "pending" && (
            <PaymentPendingView
              title={state.title}
              description={state.description}
              variant={state.variant}
              icon={state.icon}
              animateIcon={state.animateIcon}
              isServiceBalance={isServiceBalance}
              canRetryVerification={state.canRetryVerification}
              onRetryVerification={polling.retry}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
