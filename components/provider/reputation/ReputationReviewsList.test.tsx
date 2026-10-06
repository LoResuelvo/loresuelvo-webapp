import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReputationReviewsList } from "./ReputationReviewsList";
import type { ProviderReview } from "@/domain/provider/reputation";

describe("ReputationReviewsList", () => {
  it("renders review with rating and description when provided", () => {
    const reviews: ProviderReview[] = [
      { workOrderId: 101, rating: 5, description: "Excelente atención y rapidez." },
    ];

    render(<ReputationReviewsList reviews={reviews} />);

    expect(screen.getByRole("heading", { name: "Reseñas" })).toBeInTheDocument();
    const card = screen.getByTestId("review-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("Trabajo #101");
    expect(card).toHaveTextContent("5");
    expect(screen.getByTestId("review-description")).toHaveTextContent("Excelente atención y rapidez.");
  });

  it("renders review without description and does not invent comments when description is empty", () => {
    const reviews: ProviderReview[] = [
      { workOrderId: 102, rating: 4, description: "" },
    ];

    render(<ReputationReviewsList reviews={reviews} />);

    const card = screen.getByTestId("review-card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("Trabajo #102");
    expect(card).toHaveTextContent("4");
    expect(screen.queryByTestId("review-description")).not.toBeInTheDocument();
  });

  it("renders next page button when hasNextPage is true", () => {
    const reviews: ProviderReview[] = [
      { workOrderId: 101, rating: 5, description: "Ok" },
    ];

    render(
      <ReputationReviewsList
        reviews={reviews}
        hasNextPage={true}
        onNextPage={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Siguiente página" })).toBeInTheDocument();
  });

  it("does not render next page button when hasNextPage is false", () => {
    const reviews: ProviderReview[] = [
      { workOrderId: 101, rating: 5, description: "Ok" },
    ];

    render(
      <ReputationReviewsList
        reviews={reviews}
        hasNextPage={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Siguiente página" })).not.toBeInTheDocument();
  });
});
