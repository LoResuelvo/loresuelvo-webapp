import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MercadoPagoError } from "./MercadoPagoError";

describe("MercadoPagoError", () => {
  it("renders cancelled heading, description, and handles retry and continue clicks", () => {
    const onRetry = vi.fn();
    const onContinue = vi.fn();
    render(<MercadoPagoError onRetry={onRetry} onContinue={onContinue} />);

    expect(screen.getByRole("heading", { name: "La conexión fue cancelada" })).toBeInTheDocument();
    expect(
      screen.getByText("No se vinculó ninguna cuenta. Podés intentar nuevamente cuando quieras."),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    const continueBtn = screen.getByRole("button", { name: "Continuar" });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
