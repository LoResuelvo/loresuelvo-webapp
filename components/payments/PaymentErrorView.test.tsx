import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaymentErrorView } from "./PaymentErrorView";

describe("PaymentErrorView", () => {
  it("should render title, description, and default back link to proposals", () => {
    render(
      <PaymentErrorView
        title="Error al procesar el pago"
        description="Ocurrió un inconveniente."
      />,
    );

    expect(screen.getByRole("heading", { name: "Error al procesar el pago" })).toBeInTheDocument();
    expect(screen.getByText("Ocurrió un inconveniente.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis propuestas" })).toBeInTheDocument();
  });

  it("should render retry verification button and trigger callback when clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <PaymentErrorView
        title="Error temporal"
        description="Por favor reintentá."
        canRetryVerification
        onRetryVerification={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Consultar nuevamente" });
    expect(retryButton).toBeInTheDocument();
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should render login button when isUnauthorized is true", () => {
    render(
      <PaymentErrorView
        title="Sesión expirada"
        description="Tu sesión venció."
        isUnauthorized
      />,
    );

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("should render retry payment link to proposal when canRetryPayment is true", () => {
    render(
      <PaymentErrorView
        title="Pago rechazado"
        description="El pago fue rechazado."
        canRetryPayment
      />,
    );

    expect(screen.getByRole("link", { name: "Volver a la propuesta" })).toBeInTheDocument();
  });

  it("should render retry payment link to work order when isServiceBalance and canRetryPayment are true", () => {
    render(
      <PaymentErrorView
        title="Pago rechazado"
        description="El pago del servicio fue rechazado."
        isServiceBalance
        canRetryPayment
      />,
    );

    expect(screen.getByRole("link", { name: "Volver a la orden de trabajo" })).toBeInTheDocument();
  });

  it("should render link to services when isServiceBalance is true without retry", () => {
    render(
      <PaymentErrorView
        title="Error"
        description="Hubo un error."
        isServiceBalance
      />,
    );

    expect(screen.getByRole("link", { name: "Volver a mis servicios" })).toBeInTheDocument();
  });
});
