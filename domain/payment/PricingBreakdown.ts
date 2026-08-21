import { Money } from "../shared/Money";
import { ScheduledDateTime } from "../shared/ScheduledDateTime";
import type { BookingTerms } from "./types";

export type PricingBreakdown = {
  readonly serviceTotal: Money;
  readonly deposit: Money;
  readonly remainingServiceBalance: Money;
  readonly platformFeeTotal: Money;
  readonly platformFeeDueNow: Money;
  readonly remainingPlatformFee: Money;
  readonly amountDueNow: Money;
  readonly remainingAmountDue: Money;
  readonly contractTotal: Money;
  readonly bookingPaymentDeadline: ScheduledDateTime;
};

function fromBookingTerms(terms: BookingTerms): PricingBreakdown {
  const currency = terms.currency ?? "ARS";

  return Object.freeze({
    serviceTotal: Money.create(terms.serviceTotalCents, currency),
    deposit: Money.create(terms.depositCents, currency),
    remainingServiceBalance: Money.create(terms.remainingServiceBalanceCents, currency),
    platformFeeTotal: Money.create(terms.platformFeeTotalCents, currency),
    platformFeeDueNow: Money.create(terms.platformFeeDueNowCents, currency),
    remainingPlatformFee: Money.create(terms.remainingPlatformFeeCents, currency),
    amountDueNow: Money.create(terms.amountDueNowCents, currency),
    remainingAmountDue: Money.create(terms.remainingAmountDueCents, currency),
    contractTotal: Money.create(terms.contractTotalCents, currency),
    bookingPaymentDeadline: ScheduledDateTime.create(terms.bookingPaymentDeadline),
  });
}

function hasRemainingBalance(pricing: PricingBreakdown): boolean {
  return Money.isPositive(pricing.remainingAmountDue);
}

function isAccountingConsistent(pricing: PricingBreakdown): boolean {
  const serviceSum = Money.add(pricing.deposit, pricing.remainingServiceBalance);
  const isServiceMatch = Money.equals(serviceSum, pricing.serviceTotal);

  const feeSum = Money.add(pricing.platformFeeDueNow, pricing.remainingPlatformFee);
  const isFeeMatch = Money.equals(feeSum, pricing.platformFeeTotal);

  const dueNowSum = Money.add(pricing.deposit, pricing.platformFeeDueNow);
  const isDueNowMatch = Money.equals(dueNowSum, pricing.amountDueNow);

  const remainingSum = Money.add(pricing.remainingServiceBalance, pricing.remainingPlatformFee);
  const isRemainingMatch = Money.equals(remainingSum, pricing.remainingAmountDue);

  const totalSum = Money.add(pricing.amountDueNow, pricing.remainingAmountDue);
  const isTotalMatch = Money.equals(totalSum, pricing.contractTotal);

  return isServiceMatch && isFeeMatch && isDueNowMatch && isRemainingMatch && isTotalMatch;
}

export const PricingBreakdownModule = {
  fromBookingTerms,
  hasRemainingBalance,
  isAccountingConsistent,
};

export const PricingBreakdown = PricingBreakdownModule;
