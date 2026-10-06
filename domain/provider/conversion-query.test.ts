import { describe, expect, it } from "vitest";
import {
  FutureConversionDateError,
  InvalidConversionRangeError,
  conversionInstant,
  conversionQueryForDays,
  conversionQueryForPeriod,
  validateConversionQuery,
} from "./conversion-query";

describe("conversion queries", () => {
  const now = new Date("2026-09-30T12:00:00-03:00");

  it("converts inclusive Buenos Aires dates to an exclusive next midnight", () => {
    expect(conversionQueryForDays("2026-06-01", "2026-06-30", now)).toEqual({
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-07-01T00:00:00-03:00",
    });
  });

  it("uses current timestamp when throughDay is today in Buenos Aires", () => {
    expect(conversionQueryForDays("2026-09-01", "2026-09-30", now)).toEqual({
      from: "2026-09-01T00:00:00-03:00",
      to: now.toISOString(),
    });
  });

  it("builds query from conversion period", () => {
    expect(
      conversionQueryForPeriod({
        from: "2026-08-01T00:00:00-03:00",
        to: "2026-08-31T00:00:00-03:00",
      })
    ).toEqual({
      from: "2026-08-01T00:00:00-03:00",
      to: "2026-08-31T00:00:00-03:00",
    });
  });

  it("rejects future dates with FutureConversionDateError", () => {
    expect(() => conversionQueryForDays("2026-09-01", "2026-10-01", now)).toThrow(
      FutureConversionDateError
    );
    expect(() => conversionQueryForDays("2026-10-01", "2026-10-05", now)).toThrow(
      FutureConversionDateError
    );
  });

  it.each([
    ["2026-08-10", "2026-08-03"], // inverted
    ["2025-01-01", "2026-01-02"], // > 365 days
    ["", "2026-08-03"], // incomplete
    ["2026-08-03", ""], // incomplete
    ["2026-02-30", "2026-03-02"], // invalid calendar day
  ])("rejects invalid or unsupported ranges (%s, %s)", (from, to) => {
    expect(() => conversionQueryForDays(from, to, now)).toThrow(
      InvalidConversionRangeError
    );
  });

  it("validates conversion query with valid range", () => {
    const valid = {
      from: "2026-08-01T00:00:00-03:00",
      to: "2026-08-31T00:00:00-03:00",
    };
    expect(validateConversionQuery(valid, now)).toEqual(valid);
  });

  it("requires paired zoned instants in validateConversionQuery", () => {
    expect(() =>
      validateConversionQuery({ from: "2026-08-01T00:00:00-03:00" }, now)
    ).toThrow(InvalidConversionRangeError);
  });

  it.each([
    "2026-02-30T00:00:00Z",
    "2026-08-01T00:00Z",
    "2026-08-01T24:00:00Z",
    "2026-08-01T12:00:00+03:60",
  ])("rejects invalid RFC3339 instants without normalizing them (%s)", (value) => {
    expect(() => conversionInstant(value)).toThrow(InvalidConversionRangeError);
  });
});
