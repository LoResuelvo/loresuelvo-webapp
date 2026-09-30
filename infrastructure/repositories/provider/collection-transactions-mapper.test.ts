import { describe, expect, it } from "vitest";
import { aCollectionTransactionsResponse } from "@/features/support/collection-factory";
import { mapCollectionTransactions } from "./collection-transactions-mapper";

describe("collection transaction mapper", () => {
  it("preserves global totals, seller money, required references and opaque cursor", () => {
    const result = mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit"));
    expect(result.totalCount).toBe(23);
    expect(result.totalAmountCents).toBe(1200001);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ id: 101, sellerAmountCents: 500001, serviceProposalId: 41, workOrderId: 51 });
    expect(result.nextCursor).toBe("opaque-signed-cursor");
  });
  it("preserves submillisecond ordering and the exclusive end", () => {
    const source = aCollectionTransactionsResponse();
    source.period = { ...source.period, from: "2026-08-20T15:00:00.000050Z", to: "2026-08-20T15:00:00.000950Z" };
    source.transactions = [
      { ...source.transactions[0], id: 1, verified_on: "2026-08-20T15:00:00.000900Z" },
      { ...source.transactions[0], id: 2, verified_on: "2026-08-20T15:00:00.000100Z" },
    ];
    expect(mapCollectionTransactions(source).transactions.map(item => item.id)).toEqual([1, 2]);
    source.transactions[0].verified_on = source.period.to;
    expect(() => mapCollectionTransactions(source)).toThrow();
  });
  it("orders IDs only when complete instants are equal across offset and precision formats", () => {
    const source = aCollectionTransactionsResponse();
    source.transactions = [
      { ...source.transactions[0], id: 2, verified_on: "2026-08-20T12:00:00.000100-03:00" },
      { ...source.transactions[0], id: 1, verified_on: "2026-08-20T15:00:00.0001Z" },
    ];
    expect(mapCollectionTransactions(source).transactions.map(item => item.id)).toEqual([2, 1]);
    source.transactions.reverse();
    expect(() => mapCollectionTransactions(source)).toThrow();
  });
  it.each([null, 0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1])("rejects missing or invalid order references %s", workOrderId => {
    const source = aCollectionTransactionsResponse();
    expect(() => mapCollectionTransactions({ ...source, transactions: [{ ...source.transactions[0], work_order_id: workOrderId }] })).toThrow();
  });
  it("rejects unsafe money, invalid currency, unknown purpose and verification outside the period", () => {
    const source = aCollectionTransactionsResponse();
    for (const override of [{ seller_amount_cents: 1.2 }, { currency: "USD" }, { purpose: "commission" }, { verified_on: source.period.to }]) {
      expect(() => mapCollectionTransactions({ ...source, transactions: [{ ...source.transactions[0], ...override }] })).toThrow();
    }
    expect(() => mapCollectionTransactions({ ...source, next_cursor: undefined })).toThrow();
    expect(() => mapCollectionTransactions({ ...source, transactions: [...source.transactions].reverse() })).toThrow();
  });
});
