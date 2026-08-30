import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutSession } from "@/domain/payment/types";
import { useBookingDepositCheckout } from "./useBookingDepositCheckout";

const checkout: CheckoutSession = {
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
};

describe("useBookingDepositCheckout", () => {
  it("persists active payment and redirects when checkout succeeds", async () => {
    const createCheckout = vi.fn().mockResolvedValue({ ok: true, checkout });
    const setItem = vi.fn();
    const redirect = vi.fn();

    const { result } = renderHook(() =>
      useBookingDepositCheckout({
        serviceProposalId: 42,
        createCheckout,
        storage: { setItem },
        redirect,
      }),
    );

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(createCheckout).toHaveBeenCalledWith(42);
    expect(setItem).toHaveBeenCalledWith(
      "activePayment",
      JSON.stringify({
        purpose: "booking_deposit",
        paymentIntentId: "intent-123",
        serviceProposalId: 42,
        expiresOn: "2026-08-11T20:30:00Z",
      }),
    );
    expect(redirect).toHaveBeenCalledWith(checkout.checkoutUrl);
    expect(result.current.errorMessage).toBeNull();
  });

  it("sets error message when checkout creation returns not ok", async () => {
    const createCheckout = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const { result } = renderHook(() =>
      useBookingDepositCheckout({
        serviceProposalId: 42,
        createCheckout,
      }),
    );

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(result.current.errorMessage).toBe("No tenés permiso para pagar esta propuesta.");
  });
});
