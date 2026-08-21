import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServiceBalancePayment } from "./ServiceBalancePayment";

describe("ServiceBalancePayment", () => {
  it("should render breakdown of service balance (80%), platform fee (4%), and total (84%)", () => {
    render(
      <ServiceBalancePayment
        workOrderId={10}
        totalServiceAmountCents={10_000_000}
      />
    );

    expect(screen.getByText("Pago del saldo del servicio")).toBeInTheDocument();
    expect(
      screen.getByText("Revisá el importe informado antes de continuar a Mercado Pago.")
    ).toBeInTheDocument();

    expect(screen.getByText("Saldo del servicio").nextSibling).toHaveTextContent(
      "$ 80.000,00"
    );
    expect(
      screen.getByText("Comisión de LoResuelvo pendiente").nextSibling
    ).toHaveTextContent("$ 4.000,00");
    expect(
      screen.getByText("Total a pagar ahora").nextSibling
    ).toHaveTextContent("$ 84.000,00");

    expect(
      screen.getByRole("button", { name: "Pagar saldo del servicio" })
    ).toBeEnabled();
    expect(
      screen.getByText("Pago seguro procesado por Mercado Pago")
    ).toBeInTheDocument();
  });

  it("should persist activePayment and redirect to the checkout URL on click", async () => {
    const user = userEvent.setup();
    const createCheckout = vi.fn().mockResolvedValue({
      ok: true,
      checkout: {
        paymentIntentId: "intent-balance-123",
        checkoutUrl: "https://www.mercadopago.com.ar/checkout?pref_id=balance-123",
        expiresOn: "2026-08-30T12:00:00Z",
      },
    });
    const setItem = vi.fn();
    const redirect = vi.fn();

    render(
      <ServiceBalancePayment
        workOrderId={10}
        totalServiceAmountCents={10_000_000}
        createCheckout={createCheckout}
        storage={{ setItem }}
        redirect={redirect}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Pagar saldo del servicio" })
    );

    expect(createCheckout).toHaveBeenCalledWith(10);
    expect(setItem).toHaveBeenCalledWith(
      "activePayment",
      JSON.stringify({
        purpose: "service_balance",
        paymentIntentId: "intent-balance-123",
        workOrderId: 10,
        expiresOn: "2026-08-30T12:00:00Z",
      })
    );
    expect(redirect).toHaveBeenCalledWith(
      "https://www.mercadopago.com.ar/checkout?pref_id=balance-123"
    );
  });

  it("should prevent duplicate submits while checkout creation is pending", async () => {
    const user = userEvent.setup();
    let resolveCheckout:
      | ((value: {
          ok: boolean;
          checkout?: {
            checkoutUrl: string;
            paymentIntentId: string;
            expiresOn: string;
          };
        }) => void)
      | undefined;
    const createCheckout = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheckout = resolve;
        })
    );

    render(
      <ServiceBalancePayment
        workOrderId={10}
        totalServiceAmountCents={10_000_000}
        createCheckout={createCheckout}
        storage={{ setItem: vi.fn() }}
        redirect={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Pagar saldo del servicio" });
    await user.dblClick(button);

    expect(createCheckout).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Preparando pago…" })
    ).toBeDisabled();

    resolveCheckout?.({
      ok: true,
      checkout: {
        paymentIntentId: "intent-123",
        checkoutUrl: "https://mercadopago.com",
        expiresOn: "2026-08-30T12:00:00Z",
      },
    });
  });

  it("should display error message when createCheckout fails", async () => {
    const user = userEvent.setup();
    const createCheckout = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <ServiceBalancePayment
        workOrderId={10}
        totalServiceAmountCents={10_000_000}
        createCheckout={createCheckout}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Pagar saldo del servicio" })
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pagar saldo del servicio" })
    ).toBeEnabled();
  });
});
