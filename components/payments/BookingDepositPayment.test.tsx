import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutSession, PaymentPricing } from "@/domain/payment/types";
import { BookingDepositPayment } from "./BookingDepositPayment";

const pricing: PaymentPricing = {
  currency: "ARS",
  depositCents: 2_000_000,
  platformFeeDueNowCents: 100_000,
  amountDueNowCents: 2_100_000,
};

const checkout: CheckoutSession = {
  paymentIntentId: "intent-123",
  status: "checkout_ready",
  checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=abc",
  expiresOn: "2026-08-11T20:30:00Z",
  pricing,
};

describe("BookingDepositPayment", () => {
  it("should render the backend pricing breakdown", () => {
    render(<BookingDepositPayment serviceProposalId={42} pricing={pricing} />);

    expect(screen.getByText("Reserva").nextSibling).toHaveTextContent("$ 20.000,00");
    expect(screen.getByText("Comisión de la plataforma").nextSibling).toHaveTextContent("$ 1.000,00");
    expect(screen.getByText("Total a pagar").nextSibling).toHaveTextContent("$ 21.000,00");
    expect(screen.getByRole("button", { name: "Pagar reserva" })).toBeEnabled();
  });

  it("should persist activePayment and redirect to the exact checkout URL", async () => {
    const user = userEvent.setup();
    const createCheckout = vi.fn().mockResolvedValue({ ok: true, checkout });
    const setItem = vi.fn();
    const redirect = vi.fn();
    render(
      <BookingDepositPayment
        serviceProposalId={42}
        pricing={pricing}
        createCheckout={createCheckout}
        storage={{ setItem }}
        redirect={redirect}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pagar reserva" }));

    expect(createCheckout).toHaveBeenCalledWith(42);
    expect(setItem).toHaveBeenCalledWith("activePayment", JSON.stringify({
      purpose: "booking_deposit",
      paymentIntentId: "intent-123",
      serviceProposalId: 42,
      expiresOn: "2026-08-11T20:30:00Z",
    }));
    expect(redirect).toHaveBeenCalledWith(checkout.checkoutUrl);
  });

  it("should prevent a duplicate request while checkout creation is pending", async () => {
    const user = userEvent.setup();
    let resolveCheckout: ((value: { ok: true; checkout: CheckoutSession }) => void) | undefined;
    const createCheckout = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveCheckout = resolve;
    }));
    render(
      <BookingDepositPayment
        serviceProposalId={42}
        pricing={pricing}
        createCheckout={createCheckout}
        storage={{ setItem: vi.fn() }}
        redirect={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Pagar reserva" });
    await user.dblClick(button);

    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Preparando pago…" })).toBeDisabled();

    resolveCheckout?.({ ok: true, checkout });
  });

  it.each([
    [401, "Tu sesión venció. Iniciá sesión nuevamente para consultar el pago."],
    [403, "No tenés permiso para pagar esta propuesta."],
    [404, "No encontramos la propuesta o el pago solicitado."],
    [409, "El pago no está disponible para esta propuesta."],
    [500, "No pudimos consultar el pago en este momento. Intentá otra vez."],
    [null, "Ocurrió un error inesperado. Intentá nuevamente."],
  ])("should show a safe message for error status %s", async (status, message) => {
    const user = userEvent.setup();
    const createCheckout = vi.fn().mockResolvedValue({ ok: false, status });
    render(
      <BookingDepositPayment
        serviceProposalId={42}
        pricing={pricing}
        createCheckout={createCheckout}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pagar reserva" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Pagar reserva" })).toBeEnabled();
  });
});
