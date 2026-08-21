import { describe, expect, it } from "vitest";
import { PricingBreakdownModule } from "./PricingBreakdown";
import type { BookingTerms } from "./types";
import { Money } from "../shared/Money";

describe("PricingBreakdown Domain Module", () => {
  const sampleTerms: BookingTerms = {
    currency: "ARS",
    serviceTotalCents: 1_500_000,
    depositCents: 300_000,
    remainingServiceBalanceCents: 1_200_000,
    platformFeeTotalCents: 150_000,
    platformFeeDueNowCents: 30_000,
    remainingPlatformFeeCents: 120_000,
    amountDueNowCents: 330_000,
    remainingAmountDueCents: 1_320_000,
    contractTotalCents: 1_650_000,
    bookingPaymentDeadline: "2026-07-04T12:30:00.000Z",
  };

  describe("fromBookingTerms", () => {
    it("converts BookingTerms into typed PricingBreakdown with Money and ScheduledDateTime VO", () => {
      const breakdown = PricingBreakdownModule.fromBookingTerms(sampleTerms);

      expect(breakdown.serviceTotal.cents).toBe(1_500_000);
      expect(breakdown.deposit.cents).toBe(300_000);
      expect(breakdown.amountDueNow.cents).toBe(330_000);
      expect(breakdown.contractTotal.cents).toBe(1_650_000);
      expect(breakdown.bookingPaymentDeadline.isoString).toBe("2026-07-04T12:30:00.000Z");
    });

    it("verifies accounting invariants", () => {
      const breakdown = PricingBreakdownModule.fromBookingTerms(sampleTerms);
      const isConsistent = PricingBreakdownModule.isAccountingConsistent(breakdown);
      expect(isConsistent).toBe(true);
    });

    it("identifies remaining balance correctly", () => {
      const breakdown = PricingBreakdownModule.fromBookingTerms(sampleTerms);
      expect(PricingBreakdownModule.hasRemainingBalance(breakdown)).toBe(true);

      const zeroRemainingTerms: BookingTerms = {
        ...sampleTerms,
        remainingAmountDueCents: 0,
        remainingServiceBalanceCents: 0,
        remainingPlatformFeeCents: 0,
      };
      const zeroBreakdown = PricingBreakdownModule.fromBookingTerms(zeroRemainingTerms);
      expect(PricingBreakdownModule.hasRemainingBalance(zeroBreakdown)).toBe(false);
    });
  });

  describe("formatting helpers", () => {
    it("formats summary amounts", () => {
      const breakdown = PricingBreakdownModule.fromBookingTerms(sampleTerms);
      expect(Money.format(breakdown.amountDueNow)).toMatch(/\$\s?3\.300,00/);
    });
  });
});
