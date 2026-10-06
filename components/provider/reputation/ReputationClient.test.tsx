import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
  reviews: [
    { workOrderId: 101, rating: 5, description: "Excelente trabajo" },
  ],
  nextCursor: null,
};

describe("ReputationClient", () => {
  it("renders reputation indicators and reviews on success", () => {
    render(<ReputationClient initialResult={{ success: true, data: mockReputation }} />);
    expect(screen.getByTestId("reputation-indicators")).toBeInTheDocument();
    expect(screen.getByTestId("reputation-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("review-card")).toBeInTheDocument();
  });

  it("renders error alert on failure", () => {
    render(<ReputationClient initialResult={{ success: false, error: "Error de prueba" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error de prueba");
  });

  it("renders accessible loading state when initialPending is true", () => {
    render(<ReputationClient initialPending={true} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Consultando reputación…");
    expect(screen.queryByTestId("reputation-indicators")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reputation-reviews")).not.toBeInTheDocument();
    expect(screen.queryByText("No tenés reseñas todavía")).not.toBeInTheDocument();
  });

  it("renders accessible loading state when initialResult is not provided", () => {
    render(<ReputationClient />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Consultando reputación…");
  });

  it("renders next page button when nextCursor is present and updates state atomically on click", async () => {
    const page1Data: ProviderReputation = {
      ...mockReputation,
      nextCursor: "cursor-page-2",
      reviews: [{ workOrderId: 201, rating: 5, description: "Página 1" }],
    };

    const page2Data: ProviderReputation = {
      ...mockReputation,
      averageRating: 4.5,
      reviewCount: 5,
      nextCursor: null,
      reviews: [{ workOrderId: 202, rating: 4, description: "Página 2" }],
    };

    const mockGetAction = vi.fn().mockResolvedValue({
      success: true,
      data: page2Data,
    });

    render(
      <ReputationClient
        initialResult={{ success: true, data: page1Data }}
        getReputationAction={mockGetAction}
      />
    );

    const button = screen.getByRole("button", { name: "Siguiente página" });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    expect(mockGetAction).toHaveBeenCalledWith({ cursor: "cursor-page-2" });
    expect(await screen.findByText("Trabajo #202")).toBeInTheDocument();
    expect(screen.queryByText("Trabajo #201")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente página" })).not.toBeInTheDocument();
  });
});
