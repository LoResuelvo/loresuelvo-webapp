import { beforeEach, describe, expect, it, vi } from "vitest";
import * as baseClient from "@/infrastructure/api/base-client";
import { ApiPaymentRepository } from "./api-payment-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiPaymentRepository", () => {
  const checkoutResponse = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create or recover a checkout session for the proposal", async () => {
    vi.mocked(baseClient.api.post).mockResolvedValue(checkoutResponse);

    const result = await new ApiPaymentRepository().createCheckoutSession(42);

    expect(baseClient.api.post).toHaveBeenCalledWith(
      "/service-proposals/42/checkout-sessions",
      {},
    );
    expect(result.paymentIntentId).toBe("intent-123");
    expect(result.checkoutUrl).toBe(checkoutResponse.checkout_url);
  });

  it("should create or recover a service balance checkout session for the work order", async () => {
    const balanceCheckoutResponse = {
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
    };

    vi.mocked(baseClient.api.post).mockResolvedValue(balanceCheckoutResponse);

    const result = await new ApiPaymentRepository().createServiceBalanceCheckout(10);

    expect(baseClient.api.post).toHaveBeenCalledWith(
      "/work-orders/10/checkout-sessions",
      {},
    );
    expect(result.paymentIntentId).toBe("intent-balance-123");
    expect(result.checkoutUrl).toBe(balanceCheckoutResponse.checkout_url);
    expect(result.pricing.remainingServiceBalanceCents).toBe(8_000_000);
  });

  it("should get a verified payment intent status", async () => {
    vi.mocked(baseClient.api.get).mockResolvedValue({ status: "paid" });

    const result = await new ApiPaymentRepository().getPaymentIntent("intent-123");

    expect(baseClient.api.get).toHaveBeenCalledWith("/payment-intents/intent-123");
    expect(result).toEqual({ paymentIntentId: "intent-123", status: "paid" });
  });
});
