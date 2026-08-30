import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaymentPendingView } from "./PaymentPendingView";

describe("PaymentPendingView", () => {
  it("should render pending title, description, and link to proposals", () => {
    render(
      <PaymentPendingView
        title="Pago en proceso"
        description="Estamos validando tu transacción."
      />,
    );

    expect(screen.getByRole("heading", { name: "Pago en proceso" })).toBeInTheDocument();
    expect(screen.getByText("Estamos validando tu transacción.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis propuestas" })).toBeInTheDocument();
  });

  it("should render link to services when isServiceBalance is true", () => {
    render(
      <PaymentPendingView
        title="Pago en proceso"
        description="Estamos validando tu transacción."
        isServiceBalance
      />,
    );

    expect(screen.getByRole("link", { name: "Volver a mis servicios" })).toBeInTheDocument();
  });

  it("should render retry verification button when canRetryVerification is true", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <PaymentPendingView
        title="Tiempo agotado"
        description="Podés reintentar verificar."
        canRetryVerification
        onRetryVerification={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Consultar nuevamente" });
    expect(retryButton).toBeInTheDocument();
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
