"use server";

import type { ProviderReputation } from "@/domain/provider/reputation";
import type { ReputationQuery } from "@/domain/provider/reputation-query";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderReputation } from "@/application/provider/get-provider-reputation";
import { ApiProviderReputationRepository } from "@/infrastructure/repositories/provider/api-provider-reputation-repository";
import { t } from "@/infrastructure/i18n/translations";
import { ApiClientError } from "@/infrastructure/api/base-client";

export type ReputationActionResult =
  | { success: true; data: ProviderReputation }
  | { success: false; error: string };

export async function getProviderReputationAction(query?: ReputationQuery): Promise<ReputationActionResult> {
  try {
    const session = await getAuthService().getSession();
    if (!session || session.user.role !== "provider") {
      return { success: false, error: t.providerReputation.unauthorized };
    }
    return {
      success: true,
      data: await getProviderReputation(new ApiProviderReputationRepository(), query),
    };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      return { success: false, error: t.providerReputation.unauthorized };
    }
    if (error instanceof ApiClientError && error.status === 400) {
      return { success: false, error: t.providerReputation.error };
    }
    return { success: false, error: t.providerReputation.error };
  }
}
