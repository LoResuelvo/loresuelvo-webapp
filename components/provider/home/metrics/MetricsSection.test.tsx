import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MetricsSection from "./MetricsSection";
import { ProviderMetrics } from "@/domain/provider/types";

const mockMetrics: ProviderMetrics = {
  incomeLabel: "$125.000",
  jobsCompletedCount: 12,
  ratingLabel: "4.8",
};

describe("MetricsSection", () => {
  it("renders the metrics section with all values", () => {
    render(<MetricsSection metrics={mockMetrics} />);

    const section = screen.getByRole("region", { name: "Métricas del Prestador" });

    const incomeMetric = within(section).getByText("$125.000");
    expect(incomeMetric).toBeInTheDocument();

    const jobsMetric = within(section).getByText("12");
    expect(jobsMetric).toBeInTheDocument();

    const ratingMetric = within(section).getByText("4.8");
    expect(ratingMetric).toBeInTheDocument();
  });

  it("renders the metric labels correctly", () => {
    render(<MetricsSection metrics={mockMetrics} />);

    const section = screen.getByRole("region", { name: "Métricas del Prestador" });

    expect(within(section).getByText("Ingresos del período")).toBeInTheDocument();
    expect(within(section).getByText("Trabajos realizados")).toBeInTheDocument();
    expect(within(section).getByText("Calificación promedio")).toBeInTheDocument();
  });
});