import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentPollingOverlay } from "./PaymentPollingOverlay";

describe("PaymentPollingOverlay", () => {
  it("should render polling status container", () => {
    render(<PaymentPollingOverlay />);

    const statusElement = screen.getByRole("status");
    expect(statusElement).toBeInTheDocument();
  });

  it("should display custom message if provided", () => {
    render(<PaymentPollingOverlay message="Verificando con Mercado Pago…" />);

    expect(screen.getByText("Verificando con Mercado Pago…")).toBeInTheDocument();
  });
});
