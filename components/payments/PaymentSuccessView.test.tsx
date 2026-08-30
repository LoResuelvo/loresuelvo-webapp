import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentSuccessView } from "./PaymentSuccessView";

describe("PaymentSuccessView", () => {
  it("should render booking deposit success content by default", () => {
    render(<PaymentSuccessView />);

    expect(screen.getByRole("heading", { name: "Pago de reserva confirmado" })).toBeInTheDocument();
    expect(
      screen.getByText("La reserva quedó confirmada correctamente."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis propuestas" })).toBeInTheDocument();
  });

  it("should render service balance success content when isServiceBalance is true", () => {
    render(<PaymentSuccessView isServiceBalance />);

    expect(screen.getByRole("heading", { name: "Pago del servicio confirmado" })).toBeInTheDocument();
    expect(
      screen.getByText("El saldo del servicio fue abonado correctamente."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis servicios" })).toBeInTheDocument();
  });
});
