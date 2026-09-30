import { api } from "@/infrastructure/api/base-client";
import type { ProviderCollectionRepository } from "@/ports/provider/provider-collection-repository";
import type { StatisticsQuery } from "@/domain/provider/statistics-query";
import type { CollectionTransactionQuery } from "@/domain/provider/collection-transaction-query";
import { collectionInstantOrder } from "./collection-payload";
import { mapCollectionTransactions } from "./collection-transactions-mapper";
import { mapProviderCollections } from "./collection-mapper";

export class ApiProviderCollectionRepository implements ProviderCollectionRepository {
  async getTransactions(query: CollectionTransactionQuery) {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.purpose !== undefined) params.set("purpose", query.purpose);
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    if (query.cursor !== undefined) params.set("cursor", query.cursor);
    const detail = mapCollectionTransactions(await api.get<unknown>(`/providers/me/statistics/collections/transactions?${params}`));
    if (collectionInstantOrder(detail.period.from, query.from) !== 0 || collectionInstantOrder(detail.period.to, query.to) !== 0) throw new Error("Mismatched transaction period");
    if (query.purpose && detail.transactions.some(transaction => transaction.purpose !== query.purpose)) throw new Error("Mismatched transaction purpose");
    return detail;
  }
  async getCollections(query: StatisticsQuery) {
    const params = new URLSearchParams();
    if (query.from !== undefined) params.set("from", query.from);
    if (query.to !== undefined) params.set("to", query.to);
    if (query.granularity !== undefined) params.set("granularity", query.granularity);
    if (query.comparePrevious !== undefined) params.set("compare_previous", String(query.comparePrevious));
    const result = mapProviderCollections(await api.get<unknown>(`/providers/me/statistics/collections${params.size ? `?${params}` : ""}`));
    if (query.comparePrevious && !result.comparison) throw new Error("Missing requested collection comparison");
    return result;
  }
}
