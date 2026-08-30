import type {
  ApiBookingTerms,
  ApiCheckoutSession,
  ApiPaymentIntent,
  ApiPaymentPricing,
  ApiServiceBalanceCheckoutSession,
  ApiServiceBalancePricing,
} from "@/infrastructure/api/types";
import type {
  BookingTerms,
  CheckoutSession,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentPricing,
} from "@/domain/payment/types";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";

export function mapApiBookingTerms(api?: ApiBookingTerms): BookingTerms | undefined {
  if (!api) return undefined;

  const currency = api.currency ?? "ARS";
  Money.create(api.service_total_cents, currency);
  Money.create(api.deposit_cents, currency);
  Money.create(api.remaining_service_balance_cents, currency);
  Money.create(api.platform_fee_total_cents, currency);
  Money.create(api.platform_fee_due_now_cents, currency);
  Money.create(api.remaining_platform_fee_cents, currency);
  Money.create(api.amount_due_now_cents, currency);
  Money.create(api.remaining_amount_due_cents, currency);
  Money.create(api.contract_total_cents, currency);
  const deadline = ScheduledDateTime.create(api.booking_payment_deadline);

  return {
    currency: api.currency,
    serviceTotalCents: api.service_total_cents,
    depositCents: api.deposit_cents,
    remainingServiceBalanceCents: api.remaining_service_balance_cents,
    platformFeeTotalCents: api.platform_fee_total_cents,
    platformFeeDueNowCents: api.platform_fee_due_now_cents,
    remainingPlatformFeeCents: api.remaining_platform_fee_cents,
    amountDueNowCents: api.amount_due_now_cents,
    remainingAmountDueCents: api.remaining_amount_due_cents,
    contractTotalCents: api.contract_total_cents,
    bookingPaymentDeadline: deadline.isoString,
  };
}

export function mapApiPaymentPricing(api: ApiPaymentPricing): PaymentPricing {
  const currency = (api.currency as "ARS" | "USD") ?? "ARS";
  const deposit = Money.create(api.deposit_cents, currency);
  const platformFee = Money.create(api.platform_fee_due_now_cents, currency);
  const amountDueNow = Money.create(api.amount_due_now_cents, currency);

  return {
    currency: api.currency,
    depositCents: deposit.cents,
    platformFeeDueNowCents: platformFee.cents,
    amountDueNowCents: amountDueNow.cents,
  };
}

export function mapApiServiceBalancePricing(api: ApiServiceBalancePricing): PaymentPricing {
  const currency = (api.currency as "ARS" | "USD") ?? "ARS";
  const remainingServiceBalance = Money.create(api.remaining_service_balance_cents, currency);
  const remainingPlatformFee = Money.create(api.remaining_platform_fee_cents, currency);
  const amountDueNow = Money.create(api.amount_due_now_cents, currency);

  return {
    currency: api.currency,
    remainingServiceBalanceCents: remainingServiceBalance.cents,
    remainingPlatformFeeCents: remainingPlatformFee.cents,
    amountDueNowCents: amountDueNow.cents,
  };
}

export function mapApiCheckoutSession(api: ApiCheckoutSession): CheckoutSession {
  const expiresOn = ScheduledDateTime.create(api.expires_on);
  return {
    paymentIntentId: api.payment_intent_id,
    status: api.status as "checkout_ready",
    checkoutUrl: api.checkout_url,
    expiresOn: expiresOn.isoString,
    pricing: mapApiPaymentPricing(api.pricing),
  };
}

export function mapApiServiceBalanceCheckoutSession(
  api: ApiServiceBalanceCheckoutSession,
): CheckoutSession {
  const expiresOn = ScheduledDateTime.create(api.expires_on);
  return {
    paymentIntentId: api.payment_intent_id,
    status: api.status as "checkout_ready",
    checkoutUrl: api.checkout_url,
    expiresOn: expiresOn.isoString,
    pricing: mapApiServiceBalancePricing(api.pricing),
  };
}

export function mapApiPaymentIntent(
  paymentIntentId: string,
  api: ApiPaymentIntent,
): PaymentIntent {
  return {
    paymentIntentId,
    status: api.status as PaymentIntentStatus,
  };
}
