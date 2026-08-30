import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkOrderSummarySection } from "./WorkOrderSummarySection";

describe("WorkOrderSummarySection", () => {
  it("renders amount, scheduled date, duration, description and completion report", () => {
    render(
      <WorkOrderSummarySection
        amountCents={1500000}
        scheduledOn="2026-08-20T10:00:00Z"
        description="Reparación de cocina"
        estimatedDurationMinutes={120}
        paidOn="2026-08-21T14:30:00Z"
        completionReport={{
          id: 1,
          description: "Trabajo terminado",
          reportedOn: "2026-08-20T12:00:00Z",
          images: [],
        }}
        review={{
          rating: 5,
          comment: "Muy buen servicio",
          createdOn: "2026-08-21T15:00:00Z",
        }}
      />
    );

    expect(screen.getByText("$ 15.000,00")).toBeInTheDocument();
    expect(screen.getByText("Reparación de cocina")).toBeInTheDocument();
    expect(screen.getByText("2 h")).toBeInTheDocument();
    expect(screen.getByTestId("work-order-paid-info")).toBeInTheDocument();
    expect(screen.getByTestId("completion-evidence-section")).toBeInTheDocument();
    expect(screen.getByTestId("work-order-review-section")).toBeInTheDocument();
    expect(screen.getByText("“Muy buen servicio”")).toBeInTheDocument();
  });
});
