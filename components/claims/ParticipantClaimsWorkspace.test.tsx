import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClaimActionResult } from "@/app/claims/actions";
import type { ClaimAcknowledgment, ClaimDetail, ClaimListCriteria, ClaimPage, ClaimReferenceOption, ClaimSummary } from "@/domain/claim/types";
import { ParticipantClaimsWorkspace } from "./ParticipantClaimsWorkspace";

const references: ClaimReferenceOption[] = [{
  value: "job_request:47",
  reference: { kind: "job_request", id: 47 },
  context: {
    title: "Reparación de cañería",
    description: "Reparar una pérdida en la cocina.",
    person: "Ana Pérez",
    personRole: "requester",
  },
}];

const acknowledgment: ClaimAcknowledgment = {
  id: 321,
  operationId: "jr-47",
  reference: { kind: "job_request", id: 47 },
  status: "open",
  createdOn: "2026-10-19T12:00:00Z",
};

const claimSummary: ClaimSummary = {
  ...acknowledgment,
  reason: "damage",
  reviewStartedOn: null,
  closedOn: null,
};

const claimDetail: ClaimDetail = {
  ...claimSummary,
  description: "La reparación dañó la cocina.",
  images: [],
  resolution: null,
};

describe("ParticipantClaimsWorkspace", () => {
  it("reloads the claims list after a claim is created", async () => {
    const onCreateClaim = vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }));
    const onListClaims = vi.fn(async (_criteria: ClaimListCriteria): Promise<ClaimActionResult<ClaimPage>> => ({
      ok: true,
      data: { items: [], page: 1, limit: 20, total: 0 },
    }));
    const onGetClaim = vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }));

    render(
      <ParticipantClaimsWorkspace
        references={references}
        onCreateClaim={onCreateClaim}
        onListClaims={onListClaims}
        onGetClaim={onGetClaim}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar reclamo" }));
    fireEvent.change(screen.getByTestId("claim-reference"), { target: { value: "job_request:47" } });
    fireEvent.change(screen.getByTestId("claim-reason"), { target: { value: "damage" } });
    fireEvent.change(screen.getByTestId("claim-description"), { target: { value: "El trabajo causó daños." } });
    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Reclamo #321 creado");
    await waitFor(() => expect(onListClaims).toHaveBeenCalledTimes(2));
    expect(onCreateClaim).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "damage", description: "El trabajo causó daños." }),
      expect.any(String),
    );
  });

  it("opens a selected claim and returns focus to the detail button when closed", async () => {
    const onCreateClaim = vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }));
    const onListClaims = vi.fn(async (): Promise<ClaimActionResult<ClaimPage>> => ({
      ok: true,
      data: { items: [claimSummary], page: 1, limit: 20, total: 1 },
    }));
    const onGetClaim = vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }));

    render(
      <ParticipantClaimsWorkspace
        references={references}
        onCreateClaim={onCreateClaim}
        onListClaims={onListClaims}
        onGetClaim={onGetClaim}
      />,
    );

    const opener = await screen.findByRole("button", { name: "Ver detalle del reclamo #321" });
    fireEvent.click(opener);
    expect(await screen.findByRole("dialog", { name: "Detalle del reclamo #321" })).toBeInTheDocument();
    expect(await screen.findByText("La reparación dañó la cocina.")).toBeInTheDocument();
    expect(onGetClaim).toHaveBeenCalledWith(321);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Detalle del reclamo #321" })).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("prioritizes claim history and opens the form from its action", async () => {
    render(
      <ParticipantClaimsWorkspace
        references={references}
        onCreateClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }))}
        onListClaims={vi.fn(async (): Promise<ClaimActionResult<ClaimPage>> => ({
          ok: true,
          data: { items: [], page: 1, limit: 20, total: 0 },
        }))}
        onGetClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }))}
      />,
    );

    const historyHeading = screen.getByRole("heading", { name: "Historial de reclamos" });
    const startButton = screen.getByRole("button", { name: "Iniciar reclamo" });
    expect(startButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("claim-reference")).not.toBeVisible();

    fireEvent.click(startButton);

    expect(screen.getByTestId("claim-reference")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar reclamo" })).toHaveFocus();
    expect(historyHeading).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar formulario" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps a deep-linked service selected until the user chooses to change it", () => {
    const proposalReference: ClaimReferenceOption = {
      value: "service_proposal:42",
      reference: { kind: "service_proposal", id: 42 },
      context: {
        title: "Cambio de grifería",
        person: "María Gómez",
        personRole: "counterpart",
        scheduledOn: "2026-10-20T12:00:00Z",
        status: "accepted",
      },
    };

    render(
      <ParticipantClaimsWorkspace
        references={[proposalReference]}
        initialReference="service_proposal:42"
        requestedReference="service_proposal:42"
        onCreateClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }))}
        onListClaims={vi.fn(async (): Promise<ClaimActionResult<ClaimPage>> => ({
          ok: true,
          data: { items: [], page: 1, limit: 20, total: 0 },
        }))}
        onGetClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }))}
      />,
    );

    const context = screen.getByTestId("claim-reference-context");
    expect(context).toHaveTextContent("Cambio de grifería");
    expect(context).toHaveTextContent("María Gómez");
    expect(context).toHaveTextContent("20 oct 2026");
    expect(context).toHaveTextContent("Aceptada");
    expect(screen.queryByTestId("claim-reference")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar servicio" }));

    expect(screen.getByTestId("claim-reference")).toHaveValue("service_proposal:42");
    expect(screen.getByTestId("claim-reference")).toHaveFocus();
  });

  it("does not invent or select a replacement when the linked service is unavailable", () => {
    render(
      <ParticipantClaimsWorkspace
        references={references}
        requestedReference="work_order:99"
        onCreateClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }))}
        onListClaims={vi.fn(async (): Promise<ClaimActionResult<ClaimPage>> => ({
          ok: true,
          data: { items: [], page: 1, limit: 20, total: 0 },
        }))}
        onGetClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }))}
      />,
    );

    expect(screen.getByTestId("claim-reference-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("claim-reference-context")).not.toBeInTheDocument();
    expect(screen.getByTestId("claim-reference")).toHaveValue("");
  });

  it("keeps a deep-linked draft when its form is closed and reopened", () => {
    const proposalReference: ClaimReferenceOption = {
      value: "service_proposal:42",
      reference: { kind: "service_proposal", id: 42 },
      context: { title: "Cambio de grifería", status: "accepted" },
    };

    render(
      <ParticipantClaimsWorkspace
        references={[proposalReference]}
        initialReference="service_proposal:42"
        requestedReference="service_proposal:42"
        onCreateClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimAcknowledgment>> => ({ ok: true, data: acknowledgment }))}
        onListClaims={vi.fn(async (): Promise<ClaimActionResult<ClaimPage>> => ({
          ok: true,
          data: { items: [], page: 1, limit: 20, total: 0 },
        }))}
        onGetClaim={vi.fn(async (): Promise<ClaimActionResult<ClaimDetail>> => ({ ok: true, data: claimDetail }))}
      />,
    );

    fireEvent.change(screen.getByTestId("claim-reason"), { target: { value: "damage" } });
    fireEvent.change(screen.getByTestId("claim-description"), { target: { value: "El problema sigue presente." } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));

    expect(screen.getByTestId("claim-description")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar reclamo" }));

    expect(screen.getByTestId("claim-reason")).toHaveValue("damage");
    expect(screen.getByTestId("claim-description")).toHaveValue("El problema sigue presente.");
    expect(screen.getByTestId("claim-description")).toBeVisible();
    expect(screen.queryByTestId("claim-reference")).not.toBeInTheDocument();
  });
});
