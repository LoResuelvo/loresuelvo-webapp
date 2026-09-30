import type { CollectionTransaction, CollectionTransactions } from "@/domain/provider/collection-transactions";
import { collectionRecord as record, collectionCount as count, collectionInstant as instant, collectionBounds as bounds, collectionInstantOrder as instantOrder } from "./collection-payload";

function positiveId(value: unknown): number {
  const id = count(value);
  if (id === 0) throw new Error("Invalid collection reference");
  return id;
}
function transaction(value: unknown): CollectionTransaction {
  const source = record(value);
  if (source.purpose !== "booking_deposit" && source.purpose !== "service_balance") throw new Error("Invalid collection purpose");
  if (source.currency !== "ARS") throw new Error("Invalid transaction currency");
  return { id: positiveId(source.id), verifiedOn: instant(source.verified_on), purpose: source.purpose,
    sellerAmountCents: count(source.seller_amount_cents), currency: source.currency,
    serviceProposalId: positiveId(source.service_proposal_id), workOrderId: positiveId(source.work_order_id),
  };
}
function validateTransactions(transactions: readonly CollectionTransaction[], period: { from: string; to: string }) {
  for (const [index, item] of transactions.entries()) {
    if (instantOrder(item.verifiedOn, period.from) < 0 || instantOrder(item.verifiedOn, period.to) >= 0) throw new Error("Transaction outside effective period");
    const previous = transactions[index - 1];
    const order = previous ? instantOrder(item.verifiedOn, previous.verifiedOn) : -1;
    if (previous && (order > 0 || (order === 0 && item.id >= previous.id))) throw new Error("Invalid transaction order");
  }
}
export function mapCollectionTransactions(value: unknown): CollectionTransactions {
  const source = record(value), period = record(source.period);
  if (source.currency !== "ARS" || period.time_zone !== "America/Argentina/Buenos_Aires") throw new Error("Invalid collection transaction currency or zone");
  if (!Array.isArray(source.transactions)) throw new Error("Missing collection transactions");
  if (source.next_cursor !== null && (typeof source.next_cursor !== "string" || !source.next_cursor.length)) throw new Error("Missing collection cursor");
  const effectivePeriod: CollectionTransactions["period"] = { ...bounds(period), timeZone: period.time_zone };
  const transactions = source.transactions.map(transaction), totalCount = count(source.total_count);
  if (totalCount < transactions.length) throw new Error("Invalid transaction count");
  validateTransactions(transactions, effectivePeriod);
  return { period: effectivePeriod, calculatedAt: instant(source.calculated_at), currency: source.currency,
    totalCount, totalAmountCents: count(source.total_amount_cents), transactions, nextCursor: source.next_cursor,
  };
}
