import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionTransactions } from "./CollectionTransactions";

describe("CollectionTransactions", () => {
  it("shows API totals independently from the visible page and real commercial references", () => {
    render(<CollectionTransactions detail={{ period: { from: "2026-08-01T00:00:00-03:00", to: "2026-08-31T00:00:00-03:00", timeZone: "America/Argentina/Buenos_Aires" }, calculatedAt: "2026-08-31T00:00:00-03:00", currency: "ARS", totalCount: 23, totalAmountCents: 1200001, nextCursor: "opaque", transactions: [{ id: 101, verifiedOn: "2026-08-20T12:00:00-03:00", purpose: "booking_deposit", sellerAmountCents: 500001, currency: "ARS", serviceProposalId: 41, workOrderId: 51 }] }} purpose="booking_deposit" pending={false} onPurpose={vi.fn()} />);
    expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("23");
    expect(screen.getByTestId("collection-detail-amount")).toHaveTextContent("12.000,01");
    const table = screen.getByRole("table", { name: "Transacciones verificadas" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("41")).toBeVisible();
    expect(within(table).getByText("51")).toBeVisible();
    expect(within(table).getByText(/5\.000,01/)).toBeVisible();
  });
});
