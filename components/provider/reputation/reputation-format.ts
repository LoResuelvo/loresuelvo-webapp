import { t } from "@/infrastructure/i18n/translations";

export function reputationRating(rating: number | null): string {
  if (rating === null) return t.providerReputation.unavailable;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}

export function reputationCoverage(percentage: number | null): string {
  if (percentage === null) return t.providerReputation.unavailable;
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(percentage)} %`;
}
