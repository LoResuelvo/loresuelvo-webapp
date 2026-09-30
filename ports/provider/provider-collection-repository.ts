import type { CollectionTransactions } from "@/domain/provider/collection-transactions";
import type { CollectionTransactionQuery } from "@/domain/provider/collection-transaction-query";
import type { ProviderCollections } from "@/domain/provider/collections";
import type { StatisticsQuery } from "@/domain/provider/statistics-query";

export interface ProviderCollectionRepository {
  getTransactions(query: CollectionTransactionQuery): Promise<CollectionTransactions>;
  getCollections(query: StatisticsQuery): Promise<ProviderCollections>;
}
