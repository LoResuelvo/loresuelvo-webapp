import type { BookingTerms, PaymentPricing } from "@/domain/payment/types";
import { Money, type Currency } from "@/domain/shared/Money";
import { t } from "@/infrastructure/i18n/translations";

export interface BookingPriceBreakdownProps {
  pricing: PaymentPricing;
  bookingTerms?: BookingTerms;
}

export function BookingPriceBreakdown({ pricing, bookingTerms }: BookingPriceBreakdownProps) {
  const currency = (pricing.currency as Currency) ?? "ARS";
  const remainingBalanceCents = bookingTerms
    ? bookingTerms.remainingServiceBalanceCents ??
      (bookingTerms.remainingAmountDueCents - bookingTerms.remainingPlatformFeeCents)
    : 0;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 space-y-3">
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">{t.payments.checkout.depositLabel}</dt>
          <dd className="font-medium text-slate-800">
            {Money.format(Money.create(pricing.depositCents ?? 0, currency))}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">{t.payments.checkout.feeLabel}</dt>
          <dd className="font-medium text-slate-800">
            {Money.format(Money.create(pricing.platformFeeDueNowCents ?? 0, currency))}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-2.5">
          <dt className="font-semibold text-slate-800">{t.payments.checkout.totalLabel}</dt>
          <dd className="text-subtitle font-bold text-brand-primary">
            {Money.format(Money.create(pricing.amountDueNowCents, currency))}
          </dd>
        </div>
      </dl>

      {remainingBalanceCents > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 bg-white/70 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{t.payments.checkout.remainingBalanceLabel}</span>
            <span>{Money.format(Money.create(remainingBalanceCents, currency))}</span>
          </div>
          <p className="text-caption text-slate-500 leading-normal">
            {t.payments.checkout.remainingBalanceHelp}
          </p>
        </div>
      )}
    </div>
  );
}
