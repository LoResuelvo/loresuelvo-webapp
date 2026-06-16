import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IncomePanel from "./IncomePanel";
import { ProviderMetrics } from "@/domain/provider/types";

const mockMetrics: ProviderMetrics = {
  incomeLabel: "$125.000",
  jobsCompletedCount: 12,
  ratingLabel: "4.8",
};

describe("IncomePanel", () => {
  it("renders the income panel with title and values", () => {
    render(<IncomePanel metrics={mockMetrics} />);

    const panel = screen.getByRole("complementary", { name: "Panel de ingresos" });

    expect(within(panel).getByText("INGRESOS DEL MES")).toBeInTheDocument();
    expect(within(panel).getByText("$125.000")).toBeInTheDocument();
    expect(within(panel).getByText("+0% vs mes anterior")).toBeInTheDocument();
    expect(within(panel).getByText("12")).toBeInTheDocument();
    expect(within(panel).getByText("4.8 ★")).toBeInTheDocument();
  });

  it("renders jobs and rating cards", () => {
    render(<IncomePanel metrics={mockMetrics} />);

    const panel = screen.getByRole("complementary", { name: "Panel de ingresos" });
    expect(within(panel).getByText("TRABAJOS")).toBeInTheDocument();
    expect(within(panel).getByText("PUNTAJE")).toBeInTheDocument();
  });
});