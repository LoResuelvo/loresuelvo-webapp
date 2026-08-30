"use client";

import { useCallback, useRef, useState } from "react";
import type { ActivePayment } from "@/domain/payment/types";
import {
  createBookingDepositCheckoutAction,
  type CreateBookingDepositCheckoutResult,
} from "@/app/consumidor/pagos/actions";
import { t } from "@/infrastructure/i18n/translations";

export interface PaymentStorage {
  setItem(key: string, value: string): void;
}

export function getPaymentErrorMessage(status: number | null): string {
  switch (status) {
    case 401:
      return t.payments.errors.unauthorized;
    case 403:
      return t.payments.errors.forbidden;
    case 404:
      return t.payments.errors.notFound;
    case 409:
      return t.payments.errors.conflict;
    case 500:
    case 504:
      return t.payments.errors.temporary;
    default:
      return t.payments.errors.generic;
  }
}

export interface UseBookingDepositCheckoutOptions {
  serviceProposalId: number;
  createCheckout?: (serviceProposalId: number) => Promise<CreateBookingDepositCheckoutResult>;
  storage?: PaymentStorage;
  redirect?: (url: string) => void;
}

export function useBookingDepositCheckout({
  serviceProposalId,
  createCheckout = createBookingDepositCheckoutAction,
  storage,
  redirect,
}: UseBookingDepositCheckoutOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const handlePayment = useCallback(async () => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createCheckout(serviceProposalId);
      if (!result.ok) {
        setErrorMessage(getPaymentErrorMessage(result.status));
        return;
      }

      const activePayment: ActivePayment = {
        purpose: "booking_deposit",
        paymentIntentId: result.checkout.paymentIntentId,
        serviceProposalId,
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
  }, [createCheckout, redirect, serviceProposalId, storage]);

  return {
    isSubmitting,
    errorMessage,
    handlePayment,
  };
}
