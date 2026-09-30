"use server";

import type { ProviderCollections } from "@/domain/provider/collections";
import type { StatisticsQuery } from "@/domain/provider/statistics-query";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderCollections } from "@/application/provider/get-provider-collections";
import { ApiProviderCollectionRepository } from "@/infrastructure/repositories/provider/api-provider-collection-repository";
import { t } from "@/infrastructure/i18n/translations";
import { ApiClientError } from "@/infrastructure/api/base-client";

export type CollectionActionResult = { success: true; data: ProviderCollections } | { success: false; error: string };

export async function getProviderCollectionsAction(query: StatisticsQuery = {}): Promise<CollectionActionResult> {
  try {
    const session = await getAuthService().getSession();
    if (!session || session.user.role !== "provider") return { success: false, error: t.providerCollections.unauthorized };
    return { success: true, data: await getProviderCollections(new ApiProviderCollectionRepository(), query) };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return { success: false, error: t.providerCollections.unauthorized };
    if (error instanceof ApiClientError && error.status === 400) return { success: false, error: t.providerActivity.invalidRange };
    return { success: false, error: t.providerCollections.error };
  }
}
