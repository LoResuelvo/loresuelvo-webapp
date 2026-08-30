"use client";

import { Button } from "@/components/ui/button";
import type { BookingTerms, PaymentPricing } from "@/domain/payment/types";
import {
  createBookingDepositCheckoutAction,
  type CreateBookingDepositCheckoutResult,
} from "@/app/consumidor/pagos/actions";
import { t } from "@/infrastructure/i18n/translations";
import { ShieldCheck } from "lucide-react";
import { BookingPriceBreakdown } from "./BookingPriceBreakdown";
import {
  useBookingDepositCheckout,
  type PaymentStorage,
} from "./useBookingDepositCheckout";

export interface BookingDepositPaymentProps {
  serviceProposalId: number;
  pricing: PaymentPricing;
  createCheckout?: (serviceProposalId: number) => Promise<CreateBookingDepositCheckoutResult>;
  storage?: PaymentStorage;
  redirect?: (url: string) => void;
  bookingTerms?: BookingTerms;
}

export function BookingDepositPayment({
  serviceProposalId,
  pricing,
  createCheckout = createBookingDepositCheckoutAction,
  storage,
  redirect,
  bookingTerms,
}: BookingDepositPaymentProps) {
  const { isSubmitting, errorMessage, handlePayment } = useBookingDepositCheckout({
    serviceProposalId,
    createCheckout,
    storage,
    redirect,
  });

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

      <BookingPriceBreakdown pricing={pricing} bookingTerms={bookingTerms} />

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
