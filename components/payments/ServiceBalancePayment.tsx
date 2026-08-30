"use client";

import { Button } from "@/components/ui/button";
import { Money, type Currency } from "@/domain/shared/Money";
import { t } from "@/infrastructure/i18n/translations";
import { ShieldCheck } from "lucide-react";
import {
  useServiceBalanceCheckout,
  type UseServiceBalanceCheckoutOptions,
} from "./useServiceBalanceCheckout";

export interface ServiceBalancePaymentProps extends UseServiceBalanceCheckoutOptions {
  totalServiceAmountCents: number;
  currency?: Currency;
}

export function ServiceBalancePayment({
  workOrderId,
  totalServiceAmountCents,
  currency = "ARS",
  createCheckout,
  storage,
  redirect,
}: ServiceBalancePaymentProps) {
  const { isSubmitting, errorMessage, handlePayment } = useServiceBalanceCheckout({
    workOrderId,
    createCheckout,
    storage,
    redirect,
  });

  const total = Money.create(totalServiceAmountCents, currency);
  const serviceBalance = Money.percentage(total, 80);
  const platformFee = Money.percentage(total, 4);
  const totalDue = Money.add(serviceBalance, platformFee);

  return (
    <section className="space-y-4 border-t border-slate-100 pt-5" aria-labelledby="service-balance-title">
      <div>
        <h3 id="service-balance-title" className="text-base font-semibold text-slate-800">{t.payments.balanceCheckout.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{t.payments.balanceCheckout.description}</p>
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 space-y-3">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4"><dt className="text-slate-600">{t.payments.balanceCheckout.serviceBalanceLabel}</dt><dd className="font-medium text-slate-800">{Money.format(serviceBalance)}</dd></div>
          <div className="flex items-center justify-between gap-4"><dt className="text-slate-600">{t.payments.balanceCheckout.platformFeeLabel}</dt><dd className="font-medium text-slate-800">{Money.format(platformFee)}</dd></div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-2.5"><dt className="font-semibold text-slate-800">{t.payments.balanceCheckout.totalLabel}</dt><dd className="text-subtitle font-bold text-brand-primary">{Money.format(totalDue)}</dd></div>
        </dl>
      </div>
      {errorMessage && <p role="alert" className="text-sm text-brand-danger bg-red-50 border border-red-200 rounded-lg p-3">{errorMessage}</p>}
      <div className="space-y-2.5 pt-1">
        <Button type="button" variant="brand" size="action" disabled={isSubmitting} aria-busy={isSubmitting} onClick={handlePayment} className="shadow-2xs hover:shadow-xs transition-all cursor-pointer font-semibold">
          {isSubmitting ? t.payments.balanceCheckout.submittingButton : t.payments.balanceCheckout.submitButton}
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.payments.balanceCheckout.securePaymentNote}</span>
        </div>
      </div>
    </section>
  );
}
