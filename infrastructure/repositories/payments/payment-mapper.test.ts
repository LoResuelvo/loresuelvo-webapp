import { describe, expect, it } from "vitest";
import {
  mapApiCheckoutSession,
  mapApiPaymentIntent,
  mapApiPaymentPricing,
  mapApiServiceBalanceCheckoutSession,
  mapApiServiceBalancePricing,
} from "./payment-mapper";

describe("payment mapper", () => {
  it("should map backend pricing without recalculating any amount", () => {
    expect(mapApiPaymentPricing({
      currency: "ARS",
      deposit_cents: 2_000_000,
      platform_fee_due_now_cents: 100_000,
      amount_due_now_cents: 2_100_000,
    })).toEqual({
      currency: "ARS",
      depositCents: 2_000_000,
      platformFeeDueNowCents: 100_000,
      amountDueNowCents: 2_100_000,
    });
  });

  it("should map a checkout session preserving the checkout URL", () => {
    expect(mapApiCheckoutSession({
      payment_intent_id: "intent-123",
      status: "checkout_ready",
      checkout_url: "https://www.mercadopago.com.ar/checkout?pref_id=abc",
      expires_on: "2026-08-11T20:30:00Z",
      pricing: {
        currency: "ARS",
        deposit_cents: 2_000_000,
        platform_fee_due_now_cents: 100_000,
        amount_due_now_cents: 2_100_000,
      },
    })).toEqual({
      paymentIntentId: "intent-123",
      status: "checkout_ready",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=abc",
      expiresOn: "2026-08-11T20:30:00Z",
      pricing: {
        currency: "ARS",
        depositCents: 2_000_000,
        platformFeeDueNowCents: 100_000,
        amountDueNowCents: 2_100_000,
      },
    });
  });

  it("should map service balance pricing without recalculating any amount", () => {
    expect(mapApiServiceBalancePricing({
      currency: "ARS",
      remaining_service_balance_cents: 8_000_000,
      remaining_platform_fee_cents: 400_000,
      amount_due_now_cents: 8_400_000,
    })).toEqual({
      currency: "ARS",
      remainingServiceBalanceCents: 8_000_000,
      remainingPlatformFeeCents: 400_000,
      amountDueNowCents: 8_400_000,
    });
  });

  it("should map a service balance checkout session preserving the checkout URL", () => {
    expect(mapApiServiceBalanceCheckoutSession({
      payment_intent_id: "intent-balance-123",
      status: "checkout_ready",
      checkout_url: "https://www.mercadopago.com.ar/checkout?pref_id=balance-123",
      expires_on: "2026-08-25T20:30:00Z",
      pricing: {
        currency: "ARS",
        remaining_service_balance_cents: 8_000_000,
        remaining_platform_fee_cents: 400_000,
        amount_due_now_cents: 8_400_000,
      },
    })).toEqual({
      paymentIntentId: "intent-balance-123",
      status: "checkout_ready",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=balance-123",
      expiresOn: "2026-08-25T20:30:00Z",
      pricing: {
        currency: "ARS",
        remainingServiceBalanceCents: 8_000_000,
        remainingPlatformFeeCents: 400_000,
        amountDueNowCents: 8_400_000,
      },
    });
  });

  it("should map the verified status using the requested payment intent id", () => {
    expect(mapApiPaymentIntent("intent-123", { status: "processing" })).toEqual({
      paymentIntentId: "intent-123",
      status: "processing",
    });
  });
});
