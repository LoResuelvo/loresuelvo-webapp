import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentIntentStatus } from "@/domain/payment/types";
import { PaymentResultPage } from "./PaymentResultPage";

function verified(status: PaymentIntentStatus) {
  return Promise.resolve({
    ok: true as const,
    paymentIntent: { paymentIntentId: "intent-123", status },
  });
}

describe("PaymentResultPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render on the server without accessing window storage", () => {
    expect(() => renderToString(
      <PaymentResultPage returnKind="success" />,
    )).not.toThrow();
  });

  it.each([
    ["checkout_ready", "paid"],
    ["processing", "paid"],
  ] as const)("should poll from %s to %s", async (initialStatus, finalStatus) => {
    const getPaymentIntent = vi.fn()
      .mockImplementationOnce(() => verified(initialStatus))
      .mockImplementationOnce(() => verified(finalStatus));
    const removeItem = vi.fn();
    render(
      <PaymentResultPage
        returnKind="success"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);
    await act(async () => vi.advanceTimersByTimeAsync(2_000));

    expect(screen.getByRole("heading", { name: "Pago de reserva confirmado" })).toBeInTheDocument();
    expect(removeItem).toHaveBeenCalledWith("activePayment");
  });

  it.each([
    ["rejected", "El pago de reserva fue rechazado"],
    ["expired", "El pago de reserva venció"],
  ] as const)("should stop at %s", async (status, message) => {
    const getPaymentIntent = vi.fn().mockImplementation(() => verified(status));
    render(
      <PaymentResultPage
        returnKind="failure"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);
    await act(async () => vi.advanceTimersByTimeAsync(10_000));

    expect(screen.getByRole("heading", { name: message })).toBeInTheDocument();
    expect(getPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it("should time out without treating processing as rejected", async () => {
    const getPaymentIntent = vi.fn().mockImplementation(() => verified("processing"));
    render(
      <PaymentResultPage
        returnKind="pending"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(screen.getByText(
      "Seguimos esperando la confirmación de Mercado Pago. Podés consultar nuevamente o volver a tus propuestas.",
    )).toBeInTheDocument();
    expect(screen.queryByText(/rechazado/i)).not.toBeInTheDocument();
  });

  it("should cancel polling when unmounted", async () => {
    const getPaymentIntent = vi.fn().mockImplementation(() => verified("processing"));
    const { unmount } = render(
      <PaymentResultPage
        returnKind="pending"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);
    expect(getPaymentIntent).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(10_000));

    expect(getPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it("should show a neutral result when no payment intent can be resolved", async () => {
    const getPaymentIntent = vi.fn();
    render(
      <PaymentResultPage
        returnKind="failure"
        search="?status=rejected&payment_id=123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    expect(screen.getByRole("heading", { name: "No pudimos identificar el pago" })).toBeInTheDocument();
    expect(screen.queryByText(/fue rechazado/i)).not.toBeInTheDocument();
    expect(getPaymentIntent).not.toHaveBeenCalled();
  });

  it("should request authentication without claiming the payment failed", async () => {
    const getPaymentIntent = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    render(
      <PaymentResultPage
        returnKind="success"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);

    expect(screen.getByRole("heading", { name: "Necesitás iniciar sesión nuevamente" })).toBeInTheDocument();
    expect(screen.queryByText(/pago falló/i)).not.toBeInTheDocument();
  });

  it.each([
    [403, "No tenés permiso para pagar esta propuesta."],
    [404, "No encontramos la propuesta o el pago solicitado."],
    [409, "El pago no está disponible para esta propuesta."],
    [500, "No pudimos consultar el pago en este momento. Intentá otra vez."],
  ])("should safely handle verification error %s", async (status, message) => {
    const getPaymentIntent = vi.fn().mockResolvedValue({ ok: false, status });
    render(
      <PaymentResultPage
        returnKind="pending"
        search="?external_reference=intent-123"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("should ignore status=approved until the backend confirms paid", async () => {
    const getPaymentIntent = vi.fn().mockImplementation(() => verified("processing"));
    render(
      <PaymentResultPage
        returnKind="success"
        search="?external_reference=intent-123&status=approved"
        storage={{ getItem: vi.fn().mockReturnValue(null), removeItem: vi.fn() }}
        getPaymentIntent={getPaymentIntent}
      />,
    );

    await act(async () => undefined);

    expect(screen.getByRole("heading", { name: "Pago en proceso" })).toBeInTheDocument();
    expect(screen.queryByText("Pago de reserva confirmado")).not.toBeInTheDocument();
  });
});
