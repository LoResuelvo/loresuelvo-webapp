import { describe, expect, it } from "vitest";
import { activityInstant, activityQueryForDays, validateActivityQuery } from "./activity-query";

describe("activity queries", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  it("turns inclusive Buenos Aires dates into an exclusive end", () => {
    expect(activityQueryForDays("2026-08-03", "2026-08-09", "week", now)).toEqual({ from: "2026-08-03T00:00:00-03:00", to: "2026-08-10T00:00:00-03:00", granularity: "week" });
  });
  it.each([["2026-08-10", "2026-08-03"], ["2026-09-30", "2026-10-01"], ["2025-01-01", "2026-01-02"], ["2026-02-30", "2026-03-02"]])("rejects invalid or unsupported ranges", (from, to) => {
    expect(() => activityQueryForDays(from, to, "day", now)).toThrow();
  });
  it("requires paired zoned instants", () => {
    expect(() => validateActivityQuery({ from: "2026-08-01T00:00:00" }, now)).toThrow();
  });
  it.each(["2026-02-30T00:00:00Z", "2026-08-01T00:00Z", "2026-08-01T24:00:00Z", "2026-08-01T12:00:00+03:60"])("rejects invalid RFC3339 instants without normalizing them", value => {
    expect(() => activityInstant(value)).toThrow();
  });
});
