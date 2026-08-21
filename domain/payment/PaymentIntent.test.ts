import { describe, expect, it } from "vitest";
import { PaymentIntentModule } from "./PaymentIntent";
import type { PaymentIntentStatus } from "./types";

describe("PaymentIntent Domain Module", () => {
  describe("isTerminalStatus", () => {
    it("returns true for terminal statuses (paid, rejected, expired)", () => {
      expect(PaymentIntentModule.isTerminalStatus("paid")).toBe(true);
      expect(PaymentIntentModule.isTerminalStatus("rejected")).toBe(true);
      expect(PaymentIntentModule.isTerminalStatus("expired")).toBe(true);
    });

    it("returns false for non-terminal statuses (checkout_ready, processing)", () => {
      expect(PaymentIntentModule.isTerminalStatus("checkout_ready")).toBe(false);
      expect(PaymentIntentModule.isTerminalStatus("processing")).toBe(false);
    });
  });

  describe("status predicates", () => {
    it("checks isPaid", () => {
      expect(PaymentIntentModule.isPaid("paid")).toBe(true);
      expect(PaymentIntentModule.isPaid("processing")).toBe(false);
    });

    it("checks isProcessing", () => {
      expect(PaymentIntentModule.isProcessing("processing")).toBe(true);
      expect(PaymentIntentModule.isProcessing("paid")).toBe(false);
    });

    it("checks isPending", () => {
      expect(PaymentIntentModule.isPending("checkout_ready")).toBe(true);
      expect(PaymentIntentModule.isPending("paid")).toBe(false);
    });
  });
});
