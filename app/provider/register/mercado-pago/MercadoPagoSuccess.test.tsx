import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MercadoPagoSuccess } from "./MercadoPagoSuccess";

describe("MercadoPagoSuccess", () => {
  it("renders success heading, description, and calls onContinue when clicked", () => {
    const onContinue = vi.fn();
    render(<MercadoPagoSuccess onContinue={onContinue} />);

    expect(screen.getByRole("heading", { name: "¡Cuenta conectada exitosamente!" })).toBeInTheDocument();
    expect(
      screen.getByText("Tu cuenta de Mercado Pago fue vinculada correctamente. Ya podés enviar propuestas de servicio."),
    ).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: "Continuar" });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
