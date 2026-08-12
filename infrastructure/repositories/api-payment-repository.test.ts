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

  it("should get a verified payment intent status", async () => {
    vi.mocked(baseClient.api.get).mockResolvedValue({ status: "paid" });

    const result = await new ApiPaymentRepository().getPaymentIntent("intent-123");

    expect(baseClient.api.get).toHaveBeenCalledWith("/payment-intents/intent-123");
    expect(result).toEqual({ paymentIntentId: "intent-123", status: "paid" });
  });
});
