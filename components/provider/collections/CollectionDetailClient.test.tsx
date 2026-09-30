import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollectionDetailClient } from "./CollectionDetailClient";
import type { CollectionTransactionsActionResult } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { getProviderCollectionTransactionsAction } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { mapCollectionTransactions } from "@/infrastructure/repositories/provider/collection-transactions-mapper";
import { aCollectionTransactionsResponse } from "@/features/support/collection-factory";
vi.mock("@/app/prestador/mi-desempeno/cobros/transaction-actions", () => ({ getProviderCollectionTransactionsAction: vi.fn() }));
describe("CollectionDetailClient", () => {
  it("ignores a late purpose response when its period is replaced", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    let resolveOld!: (result: CollectionTransactionsActionResult) => void;
    vi.mocked(getProviderCollectionTransactionsAction).mockReturnValue(new Promise(resolve => { resolveOld = resolve; }));
    const view = render(<CollectionDetailClient key="old" period={detail.period} initialResult={{ success: true, data: detail }} />);
    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "booking_deposit");
    const newer = { ...detail, totalCount: 99, period: { ...detail.period, from: "2026-08-02T00:00:00-03:00" } };
    view.rerender(<CollectionDetailClient key="new" period={newer.period} initialResult={{ success: true, data: newer }} />);
    await act(async () => resolveOld({ success: true, data: mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit")) }));
    expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("99");
    expect(screen.getByLabelText("Propósito")).toHaveValue("");
  });
  it("requests only effective bounds and selected purpose", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    vi.mocked(getProviderCollectionTransactionsAction).mockResolvedValue({ success: true, data: mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit")) });
    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);
    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "booking_deposit");
    await waitFor(() => expect(getProviderCollectionTransactionsAction).toHaveBeenCalledWith({ from: detail.period.from, to: detail.period.to, purpose: "booking_deposit" }));
    expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("23");
  });
});
