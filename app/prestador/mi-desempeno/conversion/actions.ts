"use server";

import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import { getAuthService } from "@/infrastructure/auth";
import { getProviderConversion } from "@/application/provider/get-provider-conversion";
import { ApiProviderConversionRepository } from "@/infrastructure/repositories/provider/api-provider-conversion-repository";
import { t } from "@/infrastructure/i18n/translations";
import { ApiClientError } from "@/infrastructure/api/base-client";

export type ConversionActionResult =
  | { success: true; data: ProviderConversion }
  | { success: false; error: string };

export async function getProviderConversionAction(
  query?: ConversionQuery
): Promise<ConversionActionResult> {
  try {
    const session = await getAuthService().getSession();
    if (!session || session.user.role !== "provider") {
      return { success: false, error: t.providerConversion.unauthorized };
    }
    return {
      success: true,
      data: await getProviderConversion(new ApiProviderConversionRepository(), query),
    };
  } catch (error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      return { success: false, error: t.providerConversion.unauthorized };
    }
    if (error instanceof ApiClientError && error.status === 400) {
      return { success: false, error: t.providerConversion.error };
    }
    return { success: false, error: t.providerConversion.error };
  }
}
