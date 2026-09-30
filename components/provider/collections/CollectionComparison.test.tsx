import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionComparison } from "./CollectionComparison";

describe("CollectionComparison", () => {
  it("preserves negative changes and marks percentages without base unavailable", () => {
    render(<CollectionComparison comparison={{
      period: { from: "2026-07-01T00:00:00-03:00", to: "2026-08-01T00:00:00-03:00", granularity: "month", timeZone: "America/Argentina/Buenos_Aires" },
      results: { bookingDepositCents: 0, serviceBalanceCents: 4000000, totalCents: 4000000 },
      changes: { bookingDepositCents: { absolute: 1000000, percentage: null }, serviceBalanceCents: { absolute: -2000000, percentage: -50 }, totalCents: { absolute: -1000000, percentage: -25 } },
    }} />);
    const table = screen.getByRole("table", { name: "Comparación de cobros" });
    expect(within(table).getByText("No disponible")).toBeVisible();
    expect(within(table).getByText("-50 %")).toBeVisible();
    expect(within(table).getByText(/-.*20\.000,00/)).toBeVisible();
  });
});
