import { describe, expect, it } from "vitest";
import { formatConversionPercentage, formatConversionRatio } from "./conversion-format";
import { t } from "@/infrastructure/i18n/translations";

describe("conversion-format", () => {
  describe("formatConversionPercentage", () => {
    it("formats a valid percentage with comma decimal separator", () => {
      expect(formatConversionPercentage(60)).toBe("60 %");
      expect(formatConversionPercentage(66.67)).toBe("66,67 %");
      expect(formatConversionPercentage(0)).toBe("0 %");
    });

    it("formats null as unavailable", () => {
      expect(formatConversionPercentage(null)).toBe(t.providerConversion.unavailable);
    });
  });

  describe("formatConversionRatio", () => {
    it("formats ratio with numerator, denominator, stage noun and formatted percentage", () => {
      expect(
        formatConversionRatio({ numerator: 6, denominator: 10, percentage: 60 }, "emitidas")
      ).toBe("6 de 10 emitidas (60 %)");
      expect(
        formatConversionRatio({ numerator: 4, denominator: 6, percentage: 66.67 }, "contratadas")
      ).toBe("4 de 6 contratadas (66,67 %)");
    });

    it("formats ratio with null percentage as unavailable", () => {
      expect(
        formatConversionRatio({ numerator: 0, denominator: 0, percentage: null }, "emitidas")
      ).toBe("0 de 0 emitidas (No disponible)");
    });

    it("distinguishes zero percentage from unavailable", () => {
      expect(
        formatConversionRatio({ numerator: 0, denominator: 10, percentage: 0 }, "emitidas")
      ).toBe("0 de 10 emitidas (0 %)");
      expect(
        formatConversionRatio({ numerator: 0, denominator: 5, percentage: 0 }, "recibidas")
      ).toBe("0 de 5 recibidas (0 %)");
    });
  });
});
