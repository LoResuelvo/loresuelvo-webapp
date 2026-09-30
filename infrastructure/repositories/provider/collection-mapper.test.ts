import { describe, expect, it } from "vitest";
import { aCollectionResponse, aComparedCollectionResponse } from "@/features/support/collection-factory";
import { mapProviderCollections } from "./collection-mapper";

describe("collection mapper", () => {
  it("maps API seller amounts and contractual pending balances", () => {
    const result = mapProviderCollections(aCollectionResponse());
    expect(result.results).toEqual({ bookingDepositCents: 1200001, serviceBalanceCents: 2800002, totalCents: 4000003 });
    expect(result.currentPending.awaitingPayment).toEqual({ orders: 2, amountCents: 1500000 });
    expect(result.evolution[1].totalCents).toBe(0);
  });
  it("maps comparison without inventing a percentage and rejects incompatible previous periods", () => {
    const source = aComparedCollectionResponse();
    expect(mapProviderCollections(source).comparison?.changes.serviceBalanceCents).toEqual({ absolute: -2000000, percentage: -50 });
    expect(mapProviderCollections(source).comparison?.changes.bookingDepositCents.percentage).toBeNull();
    source.comparison!.period.to = "2026-08-05T00:00:00-03:00";
    expect(() => mapProviderCollections(source)).toThrow();
  });
  it("rejects a previous duration that differs within a millisecond", () => {
    const source = aComparedCollectionResponse();
    source.period.from = "2026-08-04T00:00:00.000100-03:00";
    source.period.to = "2026-09-13T00:00:00.000900-03:00";
    source.evolution[0].from = source.period.from;
    source.evolution[1].to = source.period.to;
    source.comparison!.period.from = "2026-06-25T00:00:00.000100-03:00";
    source.comparison!.period.to = source.period.from;
    expect(() => mapProviderCollections(source)).toThrow("Invalid collection comparison period");
  });
  it("accepts equal precise durations even when they cross different millisecond boundaries", () => {
    const source = aComparedCollectionResponse();
    source.period.from = "2026-08-04T00:00:00.000100-03:00";
    source.period.to = "2026-09-13T00:00:00.000900-03:00";
    source.evolution[0].from = source.period.from;
    source.evolution[1].to = source.period.to;
    source.comparison!.period.from = "2026-06-24T23:59:59.999300-03:00";
    source.comparison!.period.to = source.period.from;
    expect(mapProviderCollections(source).comparison).toBeDefined();
  });
  it.each([NaN, -1, 1.2, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe money %s", amount => {
    const source = aCollectionResponse(); source.results.total_cents = amount;
    expect(() => mapProviderCollections(source)).toThrow();
  });
  it("rejects wrong currency, missing bounds and broken chronology", () => {
    expect(() => mapProviderCollections({ ...aCollectionResponse(), currency: "USD" })).toThrow();
    const source = aCollectionResponse(); source.evolution[1].from = source.period.from;
    expect(() => mapProviderCollections(source)).toThrow();
    expect(() => mapProviderCollections({ ...aCollectionResponse(), calculated_at: "2026-02-30T00:00:00Z" })).toThrow();
  });
});
