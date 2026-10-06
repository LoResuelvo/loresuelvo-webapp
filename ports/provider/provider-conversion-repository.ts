import type { ProviderConversion } from "@/domain/provider/conversion";
import type { ConversionQuery } from "@/domain/provider/conversion-query";

export interface ProviderConversionRepository {
  getConversion(query?: ConversionQuery): Promise<ProviderConversion>;
}
