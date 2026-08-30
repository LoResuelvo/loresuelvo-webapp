import { describe, expect, it, vi } from "vitest";
import type { PaymentRepository } from "@/ports/payments/payment-repository";
import { createServiceBalanceCheckout } from "./create-service-balance-checkout";

describe("createServiceBalanceCheckout", () => {
  it("should return the checkout created or recovered by the repository", async () => {
    const checkout = {
      paymentIntentId: "intent-balance-123",
      status: "checkout_ready" as const,
      checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=balance-123",
      expiresOn: "2026-08-25T20:30:00Z",
      pricing: {
        currency: "ARS",
        remainingServiceBalanceCents: 8_000_000,
        remainingPlatformFeeCents: 400_000,
        amountDueNowCents: 8_400_000,
      },
    };
    const repository = {
      createServiceBalanceCheckout: vi.fn().mockResolvedValue(checkout),
    } as unknown as PaymentRepository;

    await expect(createServiceBalanceCheckout(repository, 10)).resolves.toEqual(checkout);
    expect(repository.createServiceBalanceCheckout).toHaveBeenCalledWith(10);
  });

  it("should propagate repository errors", async () => {
    const error = new Error("checkout unavailable");
    const repository = {
      createServiceBalanceCheckout: vi.fn().mockRejectedValue(error),
    } as unknown as PaymentRepository;

    await expect(createServiceBalanceCheckout(repository, 10)).rejects.toBe(error);
  });
});
