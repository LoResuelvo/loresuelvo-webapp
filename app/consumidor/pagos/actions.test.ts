import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/infrastructure/api/base-client";
import { createBookingDepositCheckoutAction } from "./actions";
import { getPaymentIntentAction } from "./actions";
import { createBookingDepositCheckout } from "@/application/payments/create-booking-deposit-checkout";
import { getPaymentIntent } from "@/application/payments/get-payment-intent";

vi.mock("@/application/payments/create-booking-deposit-checkout", () => ({
  createBookingDepositCheckout: vi.fn(),
}));

vi.mock("@/application/payments/get-payment-intent", () => ({
  getPaymentIntent: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/api-payment-repository", () => ({
  ApiPaymentRepository: vi.fn(),
}));

describe("createBookingDepositCheckoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the checkout", async () => {
    const checkout = { paymentIntentId: "intent-123" };
    vi.mocked(createBookingDepositCheckout).mockResolvedValue(checkout as never);

    await expect(createBookingDepositCheckoutAction(42)).resolves.toEqual({
      ok: true,
      checkout,
    });
  });

  it("should expose only the HTTP status for an API error", async () => {
    vi.mocked(createBookingDepositCheckout).mockRejectedValue(
      new ApiClientError(409, "Conflict", "internal backend detail"),
    );

    await expect(createBookingDepositCheckoutAction(42)).resolves.toEqual({
      ok: false,
      status: 409,
    });
  });

  it("should hide unexpected error details", async () => {
    vi.mocked(createBookingDepositCheckout).mockRejectedValue(
      new Error("sensitive detail"),
    );

    await expect(createBookingDepositCheckoutAction(42)).resolves.toEqual({
      ok: false,
      status: null,
    });
  });
});

describe("getPaymentIntentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the verified payment intent", async () => {
    const paymentIntent = { paymentIntentId: "intent-123", status: "paid" };
    vi.mocked(getPaymentIntent).mockResolvedValue(paymentIntent as never);

    await expect(getPaymentIntentAction("intent-123")).resolves.toEqual({
      ok: true,
      paymentIntent,
    });
  });

  it("should expose only the HTTP status when verification fails", async () => {
    vi.mocked(getPaymentIntent).mockRejectedValue(
      new ApiClientError(401, "Unauthorized", "internal backend detail"),
    );

    await expect(getPaymentIntentAction("intent-123")).resolves.toEqual({
      ok: false,
      status: 401,
    });
  });
});
