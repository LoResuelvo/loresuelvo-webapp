"use server";

import type { ProviderActivity } from "@/domain/provider/activity";
import type { ActivityQuery } from "@/domain/provider/activity-query";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderActivity } from "@/application/provider/get-provider-activity";
import { ApiProviderActivityRepository } from "@/infrastructure/repositories/provider/api-provider-activity-repository";
import { t } from "@/infrastructure/i18n/translations";
import { ApiClientError } from "@/infrastructure/api/base-client";

export type ActivityActionResult = { success: true; data: ProviderActivity } | { success: false; error: string };

export async function getProviderActivityAction(query: ActivityQuery = {}): Promise<ActivityActionResult> {
  try {
    const session = await getAuthService().getSession();
    if (!session || session.user.role !== "provider") return { success: false, error: t.providerActivity.unauthorized };
    return { success: true, data: await getProviderActivity(new ApiProviderActivityRepository(), query) };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return { success: false, error: t.providerActivity.unauthorized };
    if (error instanceof ApiClientError && error.status === 400) return { success: false, error: t.providerActivity.invalidRange };
    return { success: false, error: t.providerActivity.error };
  }
}
