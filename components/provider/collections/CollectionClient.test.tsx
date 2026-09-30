import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollectionClient } from "./CollectionClient";
import { getProviderCollectionsAction } from "@/app/prestador/mi-desempeno/cobros/actions";
import { mapProviderCollections } from "@/infrastructure/repositories/provider/collection-mapper";
import { aCollectionResponse, aComparedCollectionResponse } from "@/features/support/collection-factory";
vi.mock("@/app/prestador/mi-desempeno/cobros/actions", () => ({ getProviderCollectionsAction: vi.fn() }));
describe("CollectionClient", () => {
  it("keeps effective instants when only grouping and comparison change", async () => {
    vi.mocked(getProviderCollectionsAction).mockResolvedValue({ success: true, data: mapProviderCollections(aComparedCollectionResponse()) });
    const initial = mapProviderCollections(aCollectionResponse());
    render(<CollectionClient initialResult={{ success: true, data: initial }} />);
    await userEvent.selectOptions(screen.getByLabelText("Agrupación"), "month");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(getProviderCollectionsAction).toHaveBeenCalledWith({ from: initial.period.from, to: initial.period.to, granularity: "month", comparePrevious: true }));
  });
});
