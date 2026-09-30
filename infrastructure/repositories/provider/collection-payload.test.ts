import { describe, expect, it } from "vitest";
import { collectionBounds, collectionInstantOrder } from "./collection-payload";
describe("collection temporal payload", () => {
  it("compares exact instants across fractional precision and timezone offsets", () => {
    expect(collectionInstantOrder("2026-08-20T12:00:00.000100-03:00", "2026-08-20T15:00:00.0001Z")).toBe(0);
    expect(collectionInstantOrder("2026-08-20T15:00:00.000900Z", "2026-08-20T15:00:00.000100Z")).toBe(1);
  });
  it("preserves the 365-day limit even for submillisecond excess", () => {
    const from = "2025-08-20T15:00:00.000100Z";
    expect(collectionBounds({ from, to: "2026-08-20T15:00:00.000100Z" })).toEqual({ from, to: "2026-08-20T15:00:00.000100Z" });
    expect(() => collectionBounds({ from, to: "2026-08-20T15:00:00.000101Z" })).toThrow();
  });
});
