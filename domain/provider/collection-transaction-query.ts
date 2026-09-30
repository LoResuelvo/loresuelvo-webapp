import type { CollectionPurpose } from "./collection-transactions";
import { validateStatisticsQuery } from "./statistics-query";

export interface CollectionTransactionQuery {
  readonly from: string;
  readonly to: string;
  readonly purpose?: CollectionPurpose;
  readonly limit?: number;
  readonly cursor?: string;
}
export function validateCollectionTransactionQuery(query: CollectionTransactionQuery): CollectionTransactionQuery {
  validateStatisticsQuery({ from: query.from, to: query.to });
  if (!query.from || !query.to) throw new Error("Missing effective collection period");
  if (query.purpose !== undefined && query.purpose !== "booking_deposit" && query.purpose !== "service_balance") throw new Error("Invalid transaction purpose");
  if (query.cursor !== undefined && (typeof query.cursor !== "string" || !query.cursor.trim().length)) throw new Error("Invalid transaction cursor");
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100)) throw new Error("Invalid transaction limit");
  return query;
}
