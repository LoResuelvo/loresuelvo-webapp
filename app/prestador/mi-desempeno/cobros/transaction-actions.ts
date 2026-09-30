"use server";

import type { CollectionTransactions } from "@/domain/provider/collection-transactions";
import type { CollectionTransactionQuery } from "@/domain/provider/collection-transaction-query";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderCollectionTransactions } from "@/application/provider/get-provider-collection-transactions";
import { ApiProviderCollectionRepository } from "@/infrastructure/repositories/provider/api-provider-collection-repository";
import { t } from "@/infrastructure/i18n/translations";
import { ApiClientError } from "@/infrastructure/api/base-client";

export type CollectionTransactionsActionResult = { success: true; data: CollectionTransactions } | { success: false; error: string };

export async function getProviderCollectionTransactionsAction(query: CollectionTransactionQuery): Promise<CollectionTransactionsActionResult> {
  try {
    const session = await getAuthService().getSession();
    if (!session || session.user.role !== "provider") return { success: false, error: t.providerCollections.unauthorized };
    return { success: true, data: await getProviderCollectionTransactions(new ApiProviderCollectionRepository(), query) };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return { success: false, error: t.providerCollections.unauthorized };
    if (error instanceof ApiClientError && error.status === 400) {
      return { success: false, error: query.cursor ? t.providerCollections.cursorError : t.providerActivity.invalidRange };
    }
    return { success: false, error: t.providerCollections.detailError };
  }
}
