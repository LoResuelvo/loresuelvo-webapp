import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionClient } from "./CollectionClient";
import { getProviderCollectionsAction } from "@/app/prestador/mi-desempeno/cobros/actions";
import { mapProviderCollections } from "@/infrastructure/repositories/provider/collection-mapper";
import { aCollectionResponse, aComparedCollectionResponse } from "@/features/support/collection-factory";
vi.mock("@/app/prestador/mi-desempeno/cobros/actions", () => ({ getProviderCollectionsAction: vi.fn() }));
describe("CollectionClient", () => {
  beforeEach(() => vi.mocked(getProviderCollectionsAction).mockReset());

  it("keeps effective instants when only grouping and comparison change", async () => {
    vi.mocked(getProviderCollectionsAction).mockResolvedValue({ success: true, data: mapProviderCollections(aComparedCollectionResponse()) });
    const initial = mapProviderCollections(aCollectionResponse());
    render(<CollectionClient initialResult={{ success: true, data: initial }} />);
    await userEvent.selectOptions(screen.getByLabelText("Agrupación"), "month");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(getProviderCollectionsAction).toHaveBeenCalledWith({ from: initial.period.from, to: initial.period.to, granularity: "month", comparePrevious: true }));
  });

  it("retries an initial summary failure with the default query", async () => {
    vi.mocked(getProviderCollectionsAction).mockResolvedValue({
      success: true,
      data: mapProviderCollections(aCollectionResponse()),
    });

    render(<CollectionClient initialResult={{ success: false, error: "No pudimos consultar tus cobros." }} />);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(getProviderCollectionsAction).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText("No pudimos consultar tus cobros.")).not.toBeInTheDocument();
  });

  it("retries a failed summary with the exact filter query", async () => {
    vi.mocked(getProviderCollectionsAction)
      .mockResolvedValueOnce({ success: false, error: "No pudimos consultar tus cobros." })
      .mockResolvedValueOnce({ success: true, data: mapProviderCollections(aCollectionResponse()) });

    const initial = mapProviderCollections(aCollectionResponse());
    render(<CollectionClient initialResult={{ success: true, data: initial }} />);
    await userEvent.selectOptions(screen.getByLabelText("Agrupación"), "month");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    const errorText = await screen.findByText("No pudimos consultar tus cobros.");

    await userEvent.click(within(errorText.closest('[role="alert"]')!).getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(getProviderCollectionsAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(getProviderCollectionsAction).mock.calls[1]).toEqual(
      vi.mocked(getProviderCollectionsAction).mock.calls[0]
    );
    expect(screen.queryByText("No pudimos consultar tus cobros.")).not.toBeInTheDocument();
  });
});
