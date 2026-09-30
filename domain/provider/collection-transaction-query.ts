import type { CollectionPurpose } from "./collection-transactions";
import { validateStatisticsQuery } from "./statistics-query";

export interface CollectionTransactionQuery {
  readonly from: string;
  readonly to: string;
  readonly purpose?: CollectionPurpose;
}
export function validateCollectionTransactionQuery(query: CollectionTransactionQuery): CollectionTransactionQuery {
  validateStatisticsQuery({ from: query.from, to: query.to });
  if (!query.from || !query.to) throw new Error("Missing effective collection period");
  if (query.purpose !== undefined && query.purpose !== "booking_deposit" && query.purpose !== "service_balance") throw new Error("Invalid transaction purpose");
  return query;
}
