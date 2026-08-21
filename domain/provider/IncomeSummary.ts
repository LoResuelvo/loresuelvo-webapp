import { Money } from "../shared/Money";
import { Rating } from "../shared/Rating";
import type { ProviderMetrics } from "./types";

function calculateTotal(amounts: Money[], currency: "ARS" | "USD" = "ARS"): Money {
  return amounts.reduce(
    (acc, current) => Money.add(acc, current),
    Money.create(0, currency),
  );
}

function formatMetrics(
  totalEarned: Money,
  jobsCompletedCount: number,
  averageRating?: number,
): ProviderMetrics {
  const ratingLabel =
    typeof averageRating === "number" && averageRating >= 1 && averageRating <= 5
      ? Rating.format(Rating.create(averageRating))
      : "0.0";

  return {
    incomeLabel: Money.format(totalEarned),
    jobsCompletedCount,
    ratingLabel,
  };
}

export const IncomeSummaryModule = {
  calculateTotal,
  formatMetrics,
};

export const IncomeSummary = IncomeSummaryModule;
