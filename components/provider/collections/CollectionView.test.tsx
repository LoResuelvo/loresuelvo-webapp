import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionView } from "./CollectionView";
import type { ProviderCollections } from "@/domain/provider/collections";

const collections: ProviderCollections = {
  period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-02T00:00:00-03:00", granularity: "day", timeZone: "America/Argentina/Buenos_Aires" },
  calculatedAt: "2026-08-02T00:00:00-03:00", currency: "ARS",
  results: { bookingDepositCents: 1200001, serviceBalanceCents: 2800002, totalCents: 4000003 },
  evolution: [{ from: "2026-08-01T00:00:00-03:00", to: "2026-08-02T00:00:00-03:00", bookingDepositCents: 0, serviceBalanceCents: 0, totalCents: 0 }],
  currentPending: { scheduled: { orders: 3, amountCents: 3000000 }, awaitingPayment: { orders: 2, amountCents: 1500000 } },
};
describe("CollectionView", () => {
  it("distinguishes seller collections and current pending balances with exact cents", () => {
    render(<CollectionView collections={collections} />);
    const results = screen.getByRole("region", { name: "Cobros verificados del período" });
    expect(within(results).getByText(/12\.000,01/)).toBeVisible();
    expect(within(results).getByText(/40\.000,03/)).toBeVisible();
    expect(screen.getByText(/No representan el saldo de tu cuenta bancaria/)).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Saldos pendientes actuales" })).getByText(/15\.000,00/)).toBeVisible();
    expect(within(screen.getByRole("table")).getAllByRole("cell")).toHaveLength(3);
  });
});
