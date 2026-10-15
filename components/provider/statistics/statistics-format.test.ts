import { describe, expect, it } from "vitest";
import { statisticsDate, statisticsDay } from "./statistics-format";

describe("statistics date presentation", () => {
  it("uses explicit separators and 24-hour time in Buenos Aires", () => {
    expect(statisticsDate("2026-08-31T17:28:00Z")).toBe("31/8/26, 14:28");
    expect(statisticsDate("2026-09-01T03:00:00Z")).toBe("1/9/26, 00:00");
  });

  it("builds date input values from the Buenos Aires calendar day", () => {
    expect(statisticsDay("2026-09-01T02:59:59Z")).toBe("2026-08-31");
    expect(statisticsDay("2026-09-01T03:00:00Z")).toBe("2026-09-01");
  });
});
