"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActivePayment, BookingTerms, PaymentPricing } from "@/domain/payment/types";
import {
  createBookingDepositCheckoutAction,
  type CreateBookingDepositCheckoutResult,
} from "@/app/consumidor/pagos/actions";
import { t } from "@/infrastructure/i18n/translations";
import { ShieldCheck } from "lucide-react";

interface PaymentStorage {
  setItem(key: string, value: string): void;
}

interface BookingDepositPaymentProps {
  serviceProposalId: number;
  pricing: PaymentPricing;
  createCheckout?: (serviceProposalId: number) => Promise<CreateBookingDepositCheckoutResult>;
  storage?: PaymentStorage;
  redirect?: (url: string) => void;
  bookingTerms?: BookingTerms;
}

function formatCurrencyCents(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

function getPaymentErrorMessage(status: number | null): string {
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

export function BookingDepositPayment({
  serviceProposalId,
  pricing,
  createCheckout = createBookingDepositCheckoutAction,
  storage,
  redirect,
  bookingTerms,
}: BookingDepositPaymentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const remainingBalanceCents = bookingTerms
    ? bookingTerms.remainingServiceBalanceCents ?? (bookingTerms.remainingAmountDueCents - bookingTerms.remainingPlatformFeeCents)
    : 0;

  async function handlePayment(): Promise<void> {
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
  }

  return (
    <section className="space-y-4 border-t border-slate-100 pt-5" aria-labelledby="booking-deposit-title">
      <div>
        <h3 id="booking-deposit-title" className="text-base font-semibold text-slate-800">
          {t.payments.checkout.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {t.payments.checkout.description}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 space-y-3">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">{t.payments.checkout.depositLabel}</dt>
            <dd className="font-medium text-slate-800">
              {formatCurrencyCents(pricing.depositCents, pricing.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-600">{t.payments.checkout.feeLabel}</dt>
            <dd className="font-medium text-slate-800">
              {formatCurrencyCents(pricing.platformFeeDueNowCents, pricing.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-2.5">
            <dt className="font-semibold text-slate-800">{t.payments.checkout.totalLabel}</dt>
            <dd className="text-subtitle font-bold text-brand-primary">
              {formatCurrencyCents(pricing.amountDueNowCents, pricing.currency)}
            </dd>
          </div>
        </dl>

        {remainingBalanceCents > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 bg-white/70 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>{t.payments.checkout.remainingBalanceLabel}</span>
              <span>{formatCurrencyCents(remainingBalanceCents, pricing.currency)}</span>
            </div>
            <p className="text-caption text-slate-500 leading-normal">
              {t.payments.checkout.remainingBalanceHelp}
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-brand-danger bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMessage}
        </p>
      )}

      <div className="space-y-2.5 pt-1">
        <Button
          type="button"
          variant="brand"
          size="action"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={handlePayment}
          className="shadow-2xs hover:shadow-xs transition-all cursor-pointer font-semibold"
        >
          {isSubmitting
            ? t.payments.checkout.submittingButton
            : t.payments.checkout.submitButton}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.payments.checkout.securePaymentNote}</span>
        </div>
      </div>
    </section>
  );
}
