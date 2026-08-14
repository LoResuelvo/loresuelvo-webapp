import type {
  ApiBookingTerms,
  ApiCheckoutSession,
  ApiPaymentIntent,
  ApiPaymentPricing,
} from "@/infrastructure/api/types";
import type {
  BookingTerms,
  CheckoutSession,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentPricing,
} from "@/domain/payment/types";

export function mapApiBookingTerms(api?: ApiBookingTerms): BookingTerms | undefined {
  if (!api) return undefined;
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
    bookingPaymentDeadline: api.booking_payment_deadline,
  };
}

export function mapApiPaymentPricing(api: ApiPaymentPricing): PaymentPricing {
  return {
    currency: api.currency,
    depositCents: api.deposit_cents,
    platformFeeDueNowCents: api.platform_fee_due_now_cents,
    amountDueNowCents: api.amount_due_now_cents,
  };
}

export function mapApiCheckoutSession(api: ApiCheckoutSession): CheckoutSession {
  return {
    paymentIntentId: api.payment_intent_id,
    status: api.status as "checkout_ready",
    checkoutUrl: api.checkout_url,
    expiresOn: api.expires_on,
    pricing: mapApiPaymentPricing(api.pricing),
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
