import type { ProviderCollectionRepository } from "@/ports/provider/provider-collection-repository";
import { validateCollectionTransactionQuery, type CollectionTransactionQuery } from "@/domain/provider/collection-transaction-query";

export async function getProviderCollectionTransactions(repository: ProviderCollectionRepository, query: CollectionTransactionQuery) {
  return repository.getTransactions(validateCollectionTransactionQuery(query));
}
