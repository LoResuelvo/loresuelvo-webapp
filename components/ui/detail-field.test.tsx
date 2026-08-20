import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DetailField } from "./detail-field";
import { DollarSign } from "lucide-react";

describe("DetailField Component", () => {
  it("renders label and text value correctly", () => {
    render(
      <DetailField
        label="Monto Acordado"
        value="$15.000"
        dataTestId="test-detail-field"
      />
    );

    expect(screen.getByText("Monto Acordado")).toBeInTheDocument();
    expect(screen.getByText("$15.000")).toBeInTheDocument();
    expect(screen.getByTestId("test-detail-field")).toBeInTheDocument();
  });

  it("renders optional icon when provided", () => {
    render(
      <DetailField
        icon={<DollarSign data-testid="test-icon" />}
        label="Monto"
        value="$20.000"
      />
    );

    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("applies highlight variant classes correctly", () => {
    render(
      <DetailField
        label="Monto Destacado"
        value="$50.000"
        variant="highlight"
        dataTestId="highlight-field"
      />
    );

    const valueElement = screen.getByText("$50.000");
    expect(valueElement.className).toContain("text-title");
  });

  it("applies compact variant classes correctly", () => {
    render(
      <DetailField
        label="Fecha"
        value="20/08/2026"
        variant="compact"
        dataTestId="compact-field"
      />
    );

    const container = screen.getByTestId("compact-field");
    expect(container.className).toContain("p-2.5");
  });

  it("merges custom className and custom style props", () => {
    render(
      <DetailField
        label="Estado"
        value="Activo"
        className="custom-container"
        labelClassName="custom-label"
        valueClassName="custom-value"
      />
    );

    expect(screen.getByText("Estado").className).toContain("custom-label");
    expect(screen.getByText("Activo").className).toContain("custom-value");
  });
});
