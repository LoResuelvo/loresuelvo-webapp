import { describe, expect, it, vi } from "vitest";
import type { PaymentRepository } from "@/ports/payment-repository";
import { getPaymentIntent } from "./get-payment-intent";

describe("getPaymentIntent", () => {
  it("should return the verified payment intent from the repository", async () => {
    const paymentIntent = {
      paymentIntentId: "intent-123",
      status: "paid" as const,
    };
    const repository = {
      getPaymentIntent: vi.fn().mockResolvedValue(paymentIntent),
    } as unknown as PaymentRepository;

    await expect(getPaymentIntent(repository, "intent-123")).resolves.toEqual(paymentIntent);
    expect(repository.getPaymentIntent).toHaveBeenCalledWith("intent-123");
  });

  it("should propagate repository errors", async () => {
    const error = new Error("session expired");
    const repository = {
      getPaymentIntent: vi.fn().mockRejectedValue(error),
    } as unknown as PaymentRepository;

    await expect(getPaymentIntent(repository, "intent-123")).rejects.toBe(error);
  });
});
