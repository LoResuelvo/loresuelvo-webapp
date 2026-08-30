import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PaymentPricing } from "@/domain/payment/types";
import { BookingPriceBreakdown } from "./BookingPriceBreakdown";

const pricing: PaymentPricing = {
  currency: "ARS",
  depositCents: 2_000_000,
  platformFeeDueNowCents: 100_000,
  amountDueNowCents: 2_100_000,
};

describe("BookingPriceBreakdown", () => {
  it("renders deposit, platform fee, and total amount due", () => {
    render(<BookingPriceBreakdown pricing={pricing} />);

    expect(screen.getByText("Reserva").nextSibling).toHaveTextContent("$ 20.000,00");
    expect(screen.getByText("Comisión de la plataforma").nextSibling).toHaveTextContent("$ 1.000,00");
    expect(screen.getByText("Total a pagar").nextSibling).toHaveTextContent("$ 21.000,00");
  });

  it("renders remaining balance when bookingTerms are supplied", () => {
    render(
      <BookingPriceBreakdown
        pricing={pricing}
        bookingTerms={{
          currency: "ARS",
          serviceTotalCents: 10_000_000,
          depositCents: 2_000_000,
          remainingServiceBalanceCents: 8_000_000,
          platformFeeTotalCents: 500_000,
          platformFeeDueNowCents: 100_000,
          remainingPlatformFeeCents: 400_000,
          amountDueNowCents: 2_100_000,
          remainingAmountDueCents: 8_400_000,
          contractTotalCents: 10_500_000,
          bookingPaymentDeadline: "2026-08-31T12:00:00Z",
        }}
      />,
    );

    expect(screen.getByText(/Saldo restante/i)).toBeInTheDocument();
    expect(screen.getByText("$ 80.000,00")).toBeInTheDocument();
  });
});
