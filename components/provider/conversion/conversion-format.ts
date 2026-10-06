import { t } from "@/infrastructure/i18n/translations";
import type { ConversionRatio } from "@/domain/provider/conversion";

export function formatConversionPercentage(percentage: number | null): string {
  if (percentage === null) return t.providerConversion.unavailable;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(percentage)} %`;
}

export function formatConversionRatio(ratio: ConversionRatio, stageNoun: string): string {
  return `${ratio.numerator} de ${ratio.denominator} ${stageNoun} (${formatConversionPercentage(ratio.percentage)})`;
}
