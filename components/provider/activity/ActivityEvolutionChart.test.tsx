import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityEvolutionChart } from "./ActivityEvolutionChart";
import type { ActivityInterval } from "@/domain/provider/activity";

const intervals: ActivityInterval[] = [
  {
    from: "2026-08-01T00:00:00-03:00",
    to: "2026-08-02T00:00:00-03:00",
    confirmedBookings: 3,
    reportedCompletions: 1,
    fullyPaidWorkOrders: 0,
  },
  {
    from: "2026-08-02T00:00:00-03:00",
    to: "2026-08-03T00:00:00-03:00",
    confirmedBookings: 0,
    reportedCompletions: 0,
    fullyPaidWorkOrders: 0,
  },
  {
    from: "2026-08-03T00:00:00-03:00",
    to: "2026-08-04T00:00:00-03:00",
    confirmedBookings: 5,
    reportedCompletions: 2,
    fullyPaidWorkOrders: 2,
  },
];

describe("ActivityEvolutionChart", () => {
  it("renders null when intervals is empty", () => {
    const { container } = render(<ActivityEvolutionChart intervals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders legend, Y-axis ticks, and interval dates", () => {
    render(<ActivityEvolutionChart intervals={intervals} />);
    expect(screen.getByText("Contrataciones confirmadas")).toBeInTheDocument();
    expect(screen.getByText("Finalizaciones informadas")).toBeInTheDocument();
    expect(screen.getByText("Trabajos con pago completo")).toBeInTheDocument();

    // Verify Y-axis tick numbers
    expect(screen.getByText("0")).toBeInTheDocument();
    // 5 is the maximum, ticks should go up to at least 5 or 6
    expect(screen.getByText("6")).toBeInTheDocument();

    // Verify X-axis date labels
    expect(screen.getByText("1/8")).toBeInTheDocument();
    expect(screen.getByText("3/8")).toBeInTheDocument();
  });

  it("displays interactive tooltip when hovering or focusing an interval", () => {
    render(<ActivityEvolutionChart intervals={intervals} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    // Initially no tooltip
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // Hover first interval (3 bookings, 1 completion, 0 paid)
    fireEvent.mouseEnter(buttons[0]);
    const tooltip = screen.getByRole("status");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("3");
    expect(tooltip).toHaveTextContent("1");
    expect(tooltip).toHaveTextContent("0");

    // Unhover removes tooltip
    fireEvent.mouseLeave(buttons[0]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
