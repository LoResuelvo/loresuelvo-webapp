import { describe, expect, it } from "vitest";
import { Money } from "./Money";

describe("Money Value Object", () => {
  describe("create", () => {
    it("creates valid ARS money instance with positive cents", () => {
      const money = Money.create(1500050);
      expect(money.cents).toBe(1500050);
      expect(money.currency).toBe("ARS");
    });

    it("creates valid USD money instance", () => {
      const money = Money.create(5000, "USD");
      expect(money.cents).toBe(5000);
      expect(money.currency).toBe("USD");
    });

    it("allows zero cents", () => {
      const money = Money.create(0);
      expect(money.cents).toBe(0);
      expect(Money.isZero(money)).toBe(true);
      expect(Money.isPositive(money)).toBe(false);
    });

    it("throws error for negative cents", () => {
      expect(() => Money.create(-1)).toThrow("Money amount cannot be negative");
    });

    it("throws error for non-integer cents", () => {
      expect(() => Money.create(100.5)).toThrow("Money cents must be an integer");
    });

    it("throws error for NaN or non-finite numbers", () => {
      expect(() => Money.create(NaN)).toThrow("Money cents must be a finite number");
      expect(() => Money.create(Infinity)).toThrow("Money cents must be a finite number");
    });

    it("throws error for unsupported currency", () => {
      // @ts-expect-error test invalid currency runtime check
      expect(() => Money.create(1000, "EUR")).toThrow("Unsupported currency: EUR");
    });
  });

  describe("fromDecimal", () => {
    it("converts decimal number to Money", () => {
      const money = Money.fromDecimal(150.75);
      expect(money.cents).toBe(15075);
      expect(money.currency).toBe("ARS");
    });

    it("handles floating point precision gracefully", () => {
      const money = Money.fromDecimal(19.99);
      expect(money.cents).toBe(1999);
    });
  });

  describe("toDecimal", () => {
    it("converts Money cents to decimal number", () => {
      const money = Money.create(1500050);
      expect(Money.toDecimal(money)).toBe(15000.5);
    });
  });

  describe("format", () => {
    it("formats ARS correctly", () => {
      const money = Money.create(1500050);
      const formatted = Money.format(money);
      // Normalized check for currency symbol and digits
      expect(formatted).toMatch(/\$\s?15\.000,50/);
    });

    it("formats zero amount correctly", () => {
      const money = Money.create(0);
      const formatted = Money.format(money);
      expect(formatted).toMatch(/\$\s?0,00/);
    });

    it("formats USD correctly", () => {
      const money = Money.create(2500, "USD");
      const formatted = Money.format(money);
      expect(formatted).toBe("$25.00");
    });
  });

  describe("arithmetic and comparison operations", () => {
    it("adds two money instances of the same currency", () => {
      const a = Money.create(1000);
      const b = Money.create(2500);
      const result = Money.add(a, b);
      expect(result.cents).toBe(3500);
      expect(result.currency).toBe("ARS");
    });

    it("throws when adding different currencies", () => {
      const a = Money.create(1000, "ARS");
      const b = Money.create(1000, "USD");
      expect(() => Money.add(a, b)).toThrow("Cannot operate with different currencies: ARS and USD");
    });

    it("subtracts two money instances of the same currency", () => {
      const a = Money.create(5000);
      const b = Money.create(2000);
      const result = Money.subtract(a, b);
      expect(result.cents).toBe(3000);
      expect(result.currency).toBe("ARS");
    });

    it("throws when subtraction results in negative amount", () => {
      const a = Money.create(2000);
      const b = Money.create(5000);
      expect(() => Money.subtract(a, b)).toThrow("Money amount cannot be negative");
    });

    it("calculates percentage correctly with rounding", () => {
      const money = Money.create(10000); // $100.00
      const twentyPercent = Money.percentage(money, 20);
      expect(twentyPercent.cents).toBe(2000);

      const oddAmount = Money.create(1005);
      const percentageResult = Money.percentage(oddAmount, 15);
      expect(percentageResult.cents).toBe(151); // 1005 * 0.15 = 150.75 -> 151
    });

    it("checks equality correctly", () => {
      const a = Money.create(1000, "ARS");
      const b = Money.create(1000, "ARS");
      const c = Money.create(2000, "ARS");
      const d = Money.create(1000, "USD");

      expect(Money.equals(a, b)).toBe(true);
      expect(Money.equals(a, c)).toBe(false);
      expect(Money.equals(a, d)).toBe(false);
    });

    it("checks isPositive and isZero correctly", () => {
      expect(Money.isPositive(Money.create(100))).toBe(true);
      expect(Money.isPositive(Money.create(0))).toBe(false);
      expect(Money.isZero(Money.create(0))).toBe(true);
      expect(Money.isZero(Money.create(100))).toBe(false);
    });

    it("compares money amounts correctly", () => {
      const a = Money.create(1000);
      const b = Money.create(2000);
      const c = Money.create(1000);

      expect(Money.compare(a, b)).toBeLessThan(0);
      expect(Money.compare(b, a)).toBeGreaterThan(0);
      expect(Money.compare(a, c)).toBe(0);
    });
  });
});
