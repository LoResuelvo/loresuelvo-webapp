import type {
  ApiCheckoutSession,
  ApiPaymentIntent,
  ApiPaymentPricing,
} from "@/infrastructure/api/types";
import type {
  CheckoutSession,
  PaymentIntent,
  PaymentIntentStatus,
  PaymentPricing,
} from "@/domain/payment/types";

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
