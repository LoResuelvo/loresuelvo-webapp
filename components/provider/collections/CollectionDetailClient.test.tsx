import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionDetailClient } from "./CollectionDetailClient";
import type { CollectionTransactionsActionResult } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { getProviderCollectionTransactionsAction } from "@/app/prestador/mi-desempeno/cobros/transaction-actions";
import { mapCollectionTransactions } from "@/infrastructure/repositories/provider/collection-transactions-mapper";
import { aCollectionTransactionsResponse } from "@/features/support/collection-factory";
vi.mock("@/app/prestador/mi-desempeno/cobros/transaction-actions", () => ({ getProviderCollectionTransactionsAction: vi.fn() }));
describe("CollectionDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  it("requests the next page with the opaque cursor and current purpose", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit"));
    const nextPageData = {
      ...detail,
      nextCursor: null,
      transactions: [{ id: 99, verifiedOn: "2026-08-18T12:00:00-03:00", purpose: "booking_deposit" as const, sellerAmountCents: 400000, currency: "ARS" as const, serviceProposalId: 43, workOrderId: 53 }],
    };
    vi.mocked(getProviderCollectionTransactionsAction).mockResolvedValue({ success: true, data: nextPageData });
    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente página" }));
    await waitFor(() => expect(getProviderCollectionTransactionsAction).toHaveBeenCalledWith({
      from: detail.period.from,
      to: detail.period.to,
      cursor: "opaque-signed-cursor",
    }));
  });
  it("shows error and retries the failed query when clicking retry", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    vi.mocked(getProviderCollectionTransactionsAction).mockResolvedValueOnce({ success: true, data: detail });

    render(<CollectionDetailClient period={detail.period} initialResult={{ success: false, error: "Error al cargar" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error al cargar");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(getProviderCollectionTransactionsAction).toHaveBeenCalledWith({ from: detail.period.from, to: detail.period.to }));
    expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("30");
  });
  it("clears the purpose before requesting the next page of all transactions", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    const depositDetail = mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit"));
    vi.mocked(getProviderCollectionTransactionsAction)
      .mockResolvedValueOnce({ success: true, data: depositDetail })
      .mockResolvedValue({ success: true, data: detail });
    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);

    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "booking_deposit");
    await waitFor(() => expect(screen.getByLabelText("Propósito")).toHaveValue("booking_deposit"));
    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "");
    await waitFor(() => expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("30"));
    expect(screen.getByLabelText("Propósito")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Siguiente página" }));

    expect(getProviderCollectionTransactionsAction).toHaveBeenLastCalledWith({
      from: detail.period.from,
      to: detail.period.to,
      cursor: detail.nextCursor,
    });
  });
  it("restores the requested purpose after retrying a rejected transport request", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    const depositDetail = mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit"));
    vi.mocked(getProviderCollectionTransactionsAction)
      .mockRejectedValueOnce(new Error("Transport unavailable"))
      .mockResolvedValue({ success: true, data: depositDetail });
    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);

    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "booking_deposit");
    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByLabelText("Propósito")).toHaveValue("booking_deposit"));
    expect(getProviderCollectionTransactionsAction).toHaveBeenNthCalledWith(2, {
      from: detail.period.from,
      to: detail.period.to,
      purpose: "booking_deposit",
    });
    await userEvent.click(screen.getByRole("button", { name: "Siguiente página" }));

    expect(getProviderCollectionTransactionsAction).toHaveBeenLastCalledWith({
      from: detail.period.from,
      to: detail.period.to,
      purpose: "booking_deposit",
      cursor: depositDetail.nextCursor,
    });
  });
  it("preserves the selected purpose when resetting failed pagination", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    const depositDetail = mapCollectionTransactions(aCollectionTransactionsResponse("booking_deposit"));
    vi.mocked(getProviderCollectionTransactionsAction)
      .mockResolvedValueOnce({ success: true, data: depositDetail })
      .mockRejectedValueOnce(new Error("Transport unavailable"))
      .mockResolvedValueOnce({ success: true, data: depositDetail });
    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);

    await userEvent.selectOptions(screen.getByLabelText("Propósito"), "booking_deposit");
    await waitFor(() => expect(screen.getByLabelText("Propósito")).toHaveValue("booking_deposit"));
    await userEvent.click(screen.getByRole("button", { name: "Siguiente página" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    await userEvent.click(screen.getByRole("button", { name: "Volver a la primera página" }));

    await waitFor(() => expect(screen.getByLabelText("Propósito")).toHaveValue("booking_deposit"));
    expect(getProviderCollectionTransactionsAction).toHaveBeenLastCalledWith({
      from: detail.period.from,
      to: detail.period.to,
      purpose: "booking_deposit",
    });
  });
  it("allows returning to first page when pagination fails with cursor", async () => {
    const detail = mapCollectionTransactions(aCollectionTransactionsResponse());
    vi.mocked(getProviderCollectionTransactionsAction)
      .mockResolvedValueOnce({ success: false, error: "La página solicitada no está disponible o el cursor expiró." })
      .mockResolvedValueOnce({ success: true, data: detail });

    render(<CollectionDetailClient period={detail.period} initialResult={{ success: true, data: detail }} />);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente página" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    expect(screen.getByRole("button", { name: "Volver a la primera página" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Volver a la primera página" }));
    await waitFor(() => expect(getProviderCollectionTransactionsAction).toHaveBeenLastCalledWith({
      from: detail.period.from,
      to: detail.period.to,
    }));
  });
});
