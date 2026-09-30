import { describe, expect, it } from "vitest";
import { mapProviderActivity } from "./activity-mapper";
import { anActivityResponse, aComparedActivityResponse } from "@/features/support/activity-factory";

describe("mapProviderActivity", () => {
  it("keeps percentages with no base unavailable and preserves signed changes", () => {
    const model = mapProviderActivity(aComparedActivityResponse());
    expect(model.comparison?.changes.confirmedBookings.percentage).toBeNull();
    expect(model.comparison?.changes.averageValueCents.absolute).toBe(-4000000);
    expect(model.comparison?.changes.reportedCompletions.percentage).toBe(200);
  });
  it("preserves API totals and null averages", () => {
    const dto = anActivityResponse();
    dto.results.average_value_cents = null;
    const model = mapProviderActivity(dto);
    expect(model.results.averageValueCents).toBeNull();
    expect(model.results.agreedValueCents).toBe(12000000);
    expect(model.evolution[1].confirmedBookings).toBe(0);
    expect(model.currentPending.requests).toBe(7);
  });
  it.each([null, {}, { results: {} }])("rejects malformed payloads", payload => {
    expect(() => mapProviderActivity(payload)).toThrow();
  });
  it("rejects unsafe monetary values", () => {
    const dto = anActivityResponse();
    dto.results.agreed_value_cents = Number.MAX_SAFE_INTEGER + 1;
    expect(() => mapProviderActivity(dto)).toThrow();
  });
  it.each(["2026-02-30T00:00:00Z", "2026-08-01T00:00Z"])("rejects malformed API timestamps", value => {
    const dto = anActivityResponse();
    dto.calculated_at = value;
    expect(() => mapProviderActivity(dto)).toThrow();
  });
  it.each([NaN, Infinity, -Infinity, null])("rejects invalid percentages with a positive base", percentage => {
    const dto = aComparedActivityResponse();
    if (!dto.comparison) throw new Error("Missing comparison fixture");
    dto.comparison.changes.reported_completions.percentage = percentage;
    expect(() => mapProviderActivity(dto)).toThrow();
  });
  it("rejects invented percentages with a zero base", () => {
    const dto = aComparedActivityResponse();
    if (!dto.comparison) throw new Error("Missing comparison fixture");
    dto.comparison.changes.confirmed_bookings.percentage = 100;
    expect(() => mapProviderActivity(dto)).toThrow();
  });
  it("rejects numeric average changes without an available average", () => {
    const dto = aComparedActivityResponse();
    dto.results.average_value_cents = null;
    expect(() => mapProviderActivity(dto)).toThrow();
  });
  it("keeps both average changes null when the average is unavailable", () => {
    const dto = aComparedActivityResponse();
    if (!dto.comparison) throw new Error("Missing comparison fixture");
    dto.results.average_value_cents = null;
    dto.comparison.changes.average_value_cents = { absolute: null, percentage: null };
    expect(mapProviderActivity(dto).comparison?.changes.averageValueCents).toEqual({ absolute: null, percentage: null });
  });
  it("rejects a previous period with a different duration", () => {
    const dto = aComparedActivityResponse();
    if (!dto.comparison) throw new Error("Missing comparison fixture");
    dto.comparison.period.from = "2026-07-03T00:00:00-03:00";
    expect(() => mapProviderActivity(dto)).toThrow();
  });
});
