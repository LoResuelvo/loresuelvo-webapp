import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClaimActionResult } from "@/app/claims/actions";
import type { ClaimListCriteria, ClaimPage, ClaimSummary } from "@/domain/claim/types";
import { ParticipantClaimsList } from "./ParticipantClaimsList";

const claim: ClaimSummary = {
  id: 321,
  operationId: "jr-47",
  reference: { kind: "job_request", id: 47 },
  status: "in_review",
  reason: "damage",
  createdOn: "2026-10-19T12:00:00Z",
  reviewStartedOn: "2026-10-20T12:00:00Z",
  closedOn: null,
};

function createListAction(
  implementation: (criteria: ClaimListCriteria) => Promise<ClaimActionResult<ClaimPage>>,
) {
  return vi.fn(implementation);
}

function listResult(
  items: ClaimSummary[] = [claim],
  overrides: Partial<ClaimPage> = {},
): ClaimActionResult<ClaimPage> {
  return {
    ok: true,
    data: { items, page: 1, limit: 20, total: items.length, ...overrides },
  };
}

describe("ParticipantClaimsList", () => {
  it("shows loading before the list request completes", async () => {
    let resolveRequest!: (result: ClaimActionResult<ClaimPage>) => void;
    const request = new Promise<ClaimActionResult<ClaimPage>>((resolve) => {
      resolveRequest = resolve;
    });
    const onListClaims = vi.fn(() => request);

    render(<ParticipantClaimsList onListClaims={onListClaims} />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando tus reclamos");
    await act(async () => resolveRequest(listResult()));
    expect(await screen.findByRole("heading", { name: "Reclamo #321" })).toBeInTheDocument();
  });

  it("shows the empty state when the selected page has no claims", async () => {
    const onListClaims = createListAction(async () => listResult([], { total: 0 }));

    render(<ParticipantClaimsList onListClaims={onListClaims} />);

    expect(await screen.findByText("No tenés reclamos para los filtros elegidos.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Historial de reclamos" })).not.toBeInTheDocument();
  });

  it("shows reason, operation, status, and only the dates that are available", async () => {
    const onListClaims = createListAction(async () => listResult());

    render(<ParticipantClaimsList onListClaims={onListClaims} />);

    expect(await screen.findByText("Daño")).toBeInTheDocument();
    expect(screen.getByText("jr-47")).toBeInTheDocument();
    expect(screen.getByText("Estado: En revisión")).toBeInTheDocument();
    expect(screen.getByText("19 oct 2026")).toBeInTheDocument();
    expect(screen.getByText("20 oct 2026")).toBeInTheDocument();
    expect(screen.queryByText("Cerrado")).not.toBeInTheDocument();
  });

  it("opens the selected claim detail and provides the opener for focus return", async () => {
    const onOpenClaim = vi.fn();
    const onListClaims = createListAction(async () => listResult());

    render(<ParticipantClaimsList onListClaims={onListClaims} onOpenClaim={onOpenClaim} />);

    await screen.findByRole("heading", { name: "Reclamo #321" });
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle del reclamo #321" }));

    expect(onOpenClaim).toHaveBeenCalledWith(321, expect.objectContaining({ tagName: "BUTTON" }));
  });

  it("shows the access error for a disabled account and retries the list", async () => {
    let callCount = 0;
    const onListClaims = createListAction(async () => {
      callCount += 1;
      if (callCount === 1) return { ok: false, status: 403, error: "forbidden" };
      return listResult();
    });

    render(<ParticipantClaimsList onListClaims={onListClaims} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu cuenta no está habilitada para consultar reclamos.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Reclamo #321" })).toBeInTheDocument();
    expect(onListClaims).toHaveBeenCalledTimes(2);
  });

  it("loads the next page and resets pagination when the status filter changes", async () => {
    const onListClaims = createListAction(async (criteria: ClaimListCriteria) =>
      listResult(
        [{ ...claim, id: criteria.page ?? 1, status: criteria.status ?? "open" }],
        { page: criteria.page ?? 1, total: 40 },
      ),
    );

    render(<ParticipantClaimsList onListClaims={onListClaims} />);
    expect(await screen.findByRole("heading", { name: "Reclamo #1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByRole("heading", { name: "Reclamo #2" })).toBeInTheDocument();
    expect(onListClaims).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "resolved" } });
    expect(await screen.findByRole("heading", { name: "Reclamo #1" })).toBeInTheDocument();
    expect(onListClaims).toHaveBeenLastCalledWith({ status: "resolved", page: 1, limit: 20 });
  });

  it("keeps a way back when a previously available page becomes empty", async () => {
    const onListClaims = createListAction(async (criteria: ClaimListCriteria) => {
      if (criteria.page === 2) return listResult([], { page: 2, total: 0 });
      return listResult([claim], { page: 1, total: 21 });
    });

    render(<ParticipantClaimsList onListClaims={onListClaims} />);
    expect(await screen.findByRole("heading", { name: "Reclamo #321" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("No tenés reclamos para los filtros elegidos.")).toBeInTheDocument();
    expect(screen.getByText("Página 2 sin resultados. Última disponible: 1.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));

    expect(await screen.findByRole("heading", { name: "Reclamo #321" })).toBeInTheDocument();
    expect(onListClaims).toHaveBeenLastCalledWith({ page: 1, limit: 20 });
  });
});
