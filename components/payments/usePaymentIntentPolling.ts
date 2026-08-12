"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentIntentStatus } from "@/domain/payment/types";
import type { GetPaymentIntentResult } from "@/app/consumidor/pagos/actions";
import { isTerminalPaymentStatus } from "@/lib/payment-utils";

const POLLING_INTERVAL_MS = 2_000;
const POLLING_TIMEOUT_MS = 30_000;

interface UsePaymentIntentPollingOptions {
  paymentIntentId: string | null;
  getPaymentIntent: (paymentIntentId: string) => Promise<GetPaymentIntentResult>;
  onPaid: () => void;
}

interface PaymentIntentPollingState {
  status: PaymentIntentStatus | null;
  errorStatus: number | null | undefined;
  isLoading: boolean;
  timedOut: boolean;
  retry: () => void;
}

export function usePaymentIntentPolling({
  paymentIntentId,
  getPaymentIntent,
  onPaid,
}: UsePaymentIntentPollingOptions): PaymentIntentPollingState {
  const [status, setStatus] = useState<PaymentIntentStatus | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(paymentIntentId));
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!paymentIntentId) {
      setIsLoading(false);
      return;
    }
    const resolvedPaymentIntentId = paymentIntentId;

    let stopped = false;
    let requestInProgress = false;
    let currentStatus: PaymentIntentStatus | null = null;

    setStatus(null);
    setErrorStatus(undefined);
    setTimedOut(false);
    setIsLoading(true);

    function stopPolling(): void {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    }

    async function checkPaymentIntent(): Promise<void> {
      if (stopped || requestInProgress) return;
      requestInProgress = true;

      try {
        const result = await getPaymentIntent(resolvedPaymentIntentId);
        if (stopped) return;

        setIsLoading(false);
        if (!result.ok) {
          setErrorStatus(result.status);
          stopPolling();
          return;
        }

        currentStatus = result.paymentIntent.status;
        setStatus(currentStatus);

        if (isTerminalPaymentStatus(currentStatus)) {
          stopPolling();
          if (currentStatus === "paid") onPaidRef.current();
        }
      } catch {
        if (!stopped) {
          setIsLoading(false);
          setErrorStatus(null);
          stopPolling();
        }
      } finally {
        requestInProgress = false;
      }
    }

    void checkPaymentIntent();
    const intervalId = setInterval(() => void checkPaymentIntent(), POLLING_INTERVAL_MS);
    const timeoutId = setTimeout(() => {
      stopped = true;
      stopPolling();
      if (!currentStatus || !isTerminalPaymentStatus(currentStatus)) {
        setIsLoading(false);
        setTimedOut(true);
      }
    }, POLLING_TIMEOUT_MS);

    return () => {
      stopped = true;
      stopPolling();
    };
  }, [attempt, getPaymentIntent, paymentIntentId]);

  return { status, errorStatus, isLoading, timedOut, retry };
}
