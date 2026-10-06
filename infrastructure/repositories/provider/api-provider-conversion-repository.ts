import { api } from "@/infrastructure/api/base-client";
import type { ProviderConversionRepository } from "@/ports/provider/provider-conversion-repository";
import { mapProviderConversion } from "./conversion-mapper";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import type { ProviderConversion } from "@/domain/provider/conversion";

export function conversionEndpoint(query?: ConversionQuery): string {
  const params = new URLSearchParams();
  if (query?.from !== undefined) params.set("from", query.from);
  if (query?.to !== undefined) params.set("to", query.to);
  return `/providers/me/statistics/conversion${params.size ? `?${params}` : ""}`;
}

export class ApiProviderConversionRepository implements ProviderConversionRepository {
  async getConversion(query?: ConversionQuery): Promise<ProviderConversion> {
    const raw = await api.get<unknown>(conversionEndpoint(query));
    return mapProviderConversion(raw);
  }
}
