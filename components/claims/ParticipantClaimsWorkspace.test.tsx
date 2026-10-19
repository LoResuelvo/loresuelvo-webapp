import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClaimActionResult } from "@/app/claims/actions";
import type { ClaimAcknowledgment, ClaimDetail, ClaimListCriteria, ClaimPage, ClaimReferenceOption, ClaimSummary } from "@/domain/claim/types";
import { ParticipantClaimsWorkspace } from "./ParticipantClaimsWorkspace";

const references: ClaimReferenceOption[] = [{
  value: "job_request:47",
  label: "Solicitud: Reparación de cañería",
  reference: { kind: "job_request", id: 47 },
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
});
