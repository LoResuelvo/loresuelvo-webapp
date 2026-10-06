import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReputationIndicators } from "./ReputationIndicators";
import type { ProviderReputation } from "@/domain/provider/reputation";
import { t } from "@/infrastructure/i18n/translations";

const mockReputation: ProviderReputation = {
  calculatedAt: "2026-08-31T00:00:00-03:00",
  averageRating: 4.8,
  reviewCount: 5,
  ratingDistribution: [
    { rating: 5, count: 4 },
    { rating: 4, count: 1 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 0 },
  ],
  eligiblePaidOrders: 6,
  reviewedPaidOrders: 5,
  coveragePercentage: 83.33,
  reviews: [],
  nextCursor: null,
};

describe("ReputationIndicators", () => {
  it("renders global indicators, star distribution, and coverage with denominator explanation", () => {
    render(<ReputationIndicators data={mockReputation} />);

    expect(screen.getByTestId("reputation-indicators")).toBeInTheDocument();
    expect(screen.getByText("4,8")).toBeInTheDocument();

    const distribution = screen.getByTestId("rating-distribution");
    expect(distribution).toBeInTheDocument();
    expect(distribution).toHaveTextContent("5 estrellas");
    expect(distribution).toHaveTextContent("4");
    expect(distribution).toHaveTextContent("4 estrellas");
    expect(distribution).toHaveTextContent("1");

    const coverage = screen.getByTestId("reputation-coverage");
    expect(coverage).toBeInTheDocument();
    expect(coverage).toHaveTextContent("83,33 %");
    expect(coverage).toHaveTextContent("6");
    expect(coverage).toHaveTextContent("5");

    expect(screen.getByText(t.providerReputation.denominatorExplanation)).toBeInTheDocument();
  });
});
