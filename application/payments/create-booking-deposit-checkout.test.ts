import { describe, expect, it, vi } from "vitest";
import type { PaymentRepository } from "@/ports/payments/payment-repository";
import { createBookingDepositCheckout } from "./create-booking-deposit-checkout";

describe("createBookingDepositCheckout", () => {
  it("should return the checkout created or recovered by the repository", async () => {
    const checkout = {
      paymentIntentId: "intent-123",
      status: "checkout_ready" as const,
      checkoutUrl: "https://www.mercadopago.com.ar/checkout",
      expiresOn: "2026-08-11T20:30:00Z",
      pricing: {
        currency: "ARS",
        depositCents: 2_000_000,
        platformFeeDueNowCents: 100_000,
        amountDueNowCents: 2_100_000,
      },
    };
    const repository = {
      createCheckoutSession: vi.fn().mockResolvedValue(checkout),
    } as unknown as PaymentRepository;

    await expect(createBookingDepositCheckout(repository, 42)).resolves.toEqual(checkout);
    expect(repository.createCheckoutSession).toHaveBeenCalledWith(42);
  });

  it("should propagate repository errors", async () => {
    const error = new Error("checkout unavailable");
    const repository = {
      createCheckoutSession: vi.fn().mockRejectedValue(error),
    } as unknown as PaymentRepository;

    await expect(createBookingDepositCheckout(repository, 42)).rejects.toBe(error);
  });
});
