import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReputationClient } from "./ReputationClient";
import type { ProviderReputation } from "@/domain/provider/reputation";

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

describe("ReputationClient", () => {
  it("renders reputation indicators on success", () => {
    render(<ReputationClient initialResult={{ success: true, data: mockReputation }} />);
    expect(screen.getByTestId("reputation-indicators")).toBeInTheDocument();
  });

  it("renders error alert on failure", () => {
    render(<ReputationClient initialResult={{ success: false, error: "Error de prueba" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error de prueba");
  });
});
