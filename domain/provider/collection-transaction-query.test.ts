import { describe, expect, it } from "vitest";
import { validateCollectionTransactionQuery } from "./collection-transaction-query";
describe("collection transaction query", () => {
  it("preserves the API effective bounds instead of recomputing default dates", () => {
    const query = { from: "2026-08-01T13:23:42-03:00", to: "2026-08-31T13:23:42-03:00", purpose: "booking_deposit" as const };
    expect(validateCollectionTransactionQuery(query)).toEqual(query);
  });
  it.each(["", "2026-02-30T00:00:00-03:00", "2026-08-31T00:00:00-03:00", "2026-08-01T00:00:00"]) ("rejects invalid effective bounds %s", from => {
    expect(() => validateCollectionTransactionQuery({ from, to: "2026-08-31T00:00:00-03:00" })).toThrow();
  });
});
