import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";
import type { ProviderConversionRepository } from "@/ports/provider/provider-conversion-repository";

export async function getProviderConversion(
  repository: ProviderConversionRepository,
  query?: ConversionQuery
): Promise<ProviderConversion> {
  return repository.getConversion(query);
}
