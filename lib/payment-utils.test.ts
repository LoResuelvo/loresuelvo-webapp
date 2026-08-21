import { describe, expect, it } from "vitest";
import { parseActivePayment, resolvePaymentIntentId } from "./payment-utils";

const storedPayment = JSON.stringify({
  purpose: "booking_deposit",
  paymentIntentId: "stored-intent",
  serviceProposalId: 42,
  expiresOn: "2026-08-11T20:30:00Z",
});

describe("payment utils", () => {
  it("should prefer external_reference over the stored payment", () => {
    expect(resolvePaymentIntentId(
      "?external_reference=external-intent&status=approved",
      storedPayment,
    )).toBe("external-intent");
  });

  it("should support payment_intent_id query param", () => {
    expect(resolvePaymentIntentId(
      "?payment_intent_id=intent-from-query&status=approved",
      storedPayment,
    )).toBe("intent-from-query");
  });

  it("should recover the payment intent from session storage", () => {
    expect(resolvePaymentIntentId("?status=pending", storedPayment)).toBe("stored-intent");
  });

  it("should ignore status and payment_id when no intent can be identified", () => {
    expect(resolvePaymentIntentId("?status=approved&payment_id=123", null)).toBeNull();
  });

  it("should safely ignore malformed or unrelated stored values", () => {
    expect(parseActivePayment("not-json")).toBeNull();
    expect(parseActivePayment(JSON.stringify({ purpose: "other_payment" }))).toBeNull();
    expect(parseActivePayment(JSON.stringify({
      purpose: "service_balance",
      paymentIntentId: "balance-intent",
      workOrderId: 10,
      expiresOn: "2026-08-11T20:30:00Z",
    }))).toEqual({
      purpose: "service_balance",
      paymentIntentId: "balance-intent",
      workOrderId: 10,
      expiresOn: "2026-08-11T20:30:00Z",
    });
  });
});
