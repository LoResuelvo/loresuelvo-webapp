import { describe, expect, it } from "vitest";
import {
  mapApiCheckoutSession,
  mapApiPaymentIntent,
  mapApiPaymentPricing,
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

  it("should map the verified status using the requested payment intent id", () => {
    expect(mapApiPaymentIntent("intent-123", { status: "processing" })).toEqual({
      paymentIntentId: "intent-123",
      status: "processing",
    });
  });
});
