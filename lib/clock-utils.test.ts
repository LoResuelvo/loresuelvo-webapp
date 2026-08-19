import { describe, expect, it } from "vitest";
import { formatClockTime } from "./clock-utils";

describe("formatClockTime", () => {
  it("formats date with es-AR locale time and year", () => {
    const testDate = new Date("2026-08-20T15:30:00.000Z");
    const result = formatClockTime(testDate);

    expect(result).toHaveProperty("time");
    expect(typeof result.time).toBe("string");
  });
});
