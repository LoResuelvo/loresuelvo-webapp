import { describe, expect, it } from "vitest";
import { IncomeSummaryModule } from "./IncomeSummary";
import { Money } from "../shared/Money";

describe("IncomeSummary Domain Module", () => {
  describe("calculateTotal", () => {
    it("calculates total income from list of Money instances", () => {
      const items = [
        Money.create(100000),
        Money.create(250000),
        Money.create(50000),
      ];
      const total = IncomeSummaryModule.calculateTotal(items);
      expect(total.cents).toBe(400000);
      expect(total.currency).toBe("ARS");
    });

    it("returns zero money for empty list", () => {
      const total = IncomeSummaryModule.calculateTotal([]);
      expect(total.cents).toBe(0);
      expect(Money.isZero(total)).toBe(true);
    });
  });

  describe("formatMetrics", () => {
    it("formats metrics accurately into ProviderMetrics POJO", () => {
      const total = Money.create(15420000); // $154.200
      const metrics = IncomeSummaryModule.formatMetrics(total, 12, 4.8);

      expect(metrics.incomeLabel).toMatch(/\$\s?154\.200,00/);
      expect(metrics.jobsCompletedCount).toBe(12);
      expect(metrics.ratingLabel).toBe("4.8");
    });

    it("handles zero rating default", () => {
      const total = Money.create(0);
      const metrics = IncomeSummaryModule.formatMetrics(total, 0);

      expect(metrics.jobsCompletedCount).toBe(0);
      expect(metrics.ratingLabel).toBe("0.0");
    });
  });
});
