import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutSession } from "@/domain/payment/types";
import { useServiceBalanceCheckout } from "./useServiceBalanceCheckout";

const checkout: CheckoutSession = {
  paymentIntentId: "intent-456",
  status: "checkout_ready",
  checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=xyz",
  expiresOn: "2026-08-15T20:30:00Z",
  pricing: {
    currency: "ARS",
    depositCents: 8_000_000,
    platformFeeDueNowCents: 400_000,
    amountDueNowCents: 8_400_000,
  },
};

describe("useServiceBalanceCheckout", () => {
  it("persists active payment and redirects when checkout succeeds", async () => {
    const createCheckout = vi.fn().mockResolvedValue({ ok: true, checkout });
    const setItem = vi.fn();
    const redirect = vi.fn();

    const { result } = renderHook(() =>
      useServiceBalanceCheckout({
        workOrderId: 99,
        createCheckout,
        storage: { setItem },
        redirect,
      }),
    );

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(createCheckout).toHaveBeenCalledWith(99);
    expect(setItem).toHaveBeenCalledWith(
      "activePayment",
      JSON.stringify({
        purpose: "service_balance",
        paymentIntentId: "intent-456",
        workOrderId: 99,
        expiresOn: "2026-08-15T20:30:00Z",
      }),
    );
    expect(redirect).toHaveBeenCalledWith(checkout.checkoutUrl);
    expect(result.current.errorMessage).toBeNull();
  });

  it("sets error message when checkout creation returns not ok", async () => {
    const createCheckout = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const { result } = renderHook(() =>
      useServiceBalanceCheckout({
        workOrderId: 99,
        createCheckout,
      }),
    );

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(result.current.errorMessage).toBe("No tenés permiso para pagar esta propuesta.");
  });
});
