"use client";

import { useCallback, useRef, useState } from "react";
import type { ActivePayment } from "@/domain/payment/types";
import {
  createServiceBalanceCheckoutAction,
  type CreateServiceBalanceCheckoutResult,
} from "@/app/work-orders/actions";
import { getPaymentErrorMessage, type PaymentStorage } from "./useBookingDepositCheckout";
import { t } from "@/infrastructure/i18n/translations";

export interface UseServiceBalanceCheckoutOptions {
  workOrderId: number;
  createCheckout?: (workOrderId: number) => Promise<CreateServiceBalanceCheckoutResult>;
  storage?: PaymentStorage;
  redirect?: (url: string) => void;
}

export function useServiceBalanceCheckout({
  workOrderId,
  createCheckout = createServiceBalanceCheckoutAction,
  storage,
  redirect,
}: UseServiceBalanceCheckoutOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const handlePayment = useCallback(async () => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createCheckout(workOrderId);
      if (!result.ok) {
        setErrorMessage(getPaymentErrorMessage(result.status));
        return;
      }

      const activePayment: ActivePayment = {
        purpose: "service_balance",
        paymentIntentId: result.checkout.paymentIntentId,
        workOrderId,
        expiresOn: result.checkout.expiresOn,
      };

      (storage ?? window.sessionStorage).setItem(
        "activePayment",
        JSON.stringify(activePayment),
      );
      (redirect ?? ((url: string) => window.location.assign(url)))(
        result.checkout.checkoutUrl,
      );
    } catch {
      setErrorMessage(t.payments.errors.generic);
    } finally {
      requestInProgress.current = false;
      setIsSubmitting(false);
    }
  }, [createCheckout, redirect, workOrderId, storage]);

  return {
    isSubmitting,
    errorMessage,
    handlePayment,
  };
}
