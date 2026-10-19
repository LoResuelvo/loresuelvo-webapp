import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClaimActionResult } from "@/app/claims/actions";
import type { ClaimDetail } from "@/domain/claim/types";
import { ParticipantClaimDetailDialog } from "./ParticipantClaimDetailDialog";

const claimDetail: ClaimDetail = {
  id: 321,
  operationId: "jr-47",
  reference: { kind: "job_request", id: 47 },
  reason: "damage",
  status: "in_review",
  createdOn: "2026-10-19T12:00:00Z",
  reviewStartedOn: "2026-10-20T12:00:00Z",
  closedOn: null,
  description: "El trabajo causó daños en la cocina.",
  images: [],
  resolution: null,
};

function detailResult(detail: ClaimDetail): ClaimActionResult<ClaimDetail> {
  return { ok: true, data: detail };
}

describe("ParticipantClaimDetailDialog", () => {
  it("shows loading while the selected claim is being fetched", () => {
    const onGetClaim = vi.fn(() => new Promise<ClaimActionResult<ClaimDetail>>(() => {}));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    expect(screen.getByRole("dialog", { name: "Detalle del reclamo #321" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando el detalle del reclamo");
    expect(onGetClaim).toHaveBeenCalledWith(321);
  });

  it("shows the claim narrative and indicates when there is no resolution yet", async () => {
    const onGetClaim = vi.fn(async () => detailResult(claimDetail));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    expect(await screen.findByText("El trabajo causó daños en la cocina.")).toBeInTheDocument();
    expect(screen.getByText("Daño")).toBeInTheDocument();
    expect(screen.getByText("jr-47")).toBeInTheDocument();
    expect(screen.getByText("Estado: En revisión")).toBeInTheDocument();
    expect(screen.getByText("No hay una resolución registrada para este reclamo todavía.")).toBeInTheDocument();
    expect(screen.getByText("Presentado").parentElement?.querySelector("time")).toHaveAttribute("dateTime", claimDetail.createdOn);
    expect(screen.getByText("En revisión desde").parentElement?.querySelector("time")).toHaveAttribute("dateTime", claimDetail.reviewStartedOn);
    expect(screen.queryByText("Cerrado")).not.toBeInTheDocument();
  });

  it("shows the recorded decision and identifies compensation as suggested", async () => {
    const resolvedClaim: ClaimDetail = {
      ...claimDetail,
      status: "resolved",
      closedOn: "2026-10-22T12:00:00Z",
      resolution: {
        type: "consumer_favor",
        reasoning: "La evidencia confirma que la reparación dañó la instalación.",
        resolvedOn: "2026-10-22T12:00:00Z",
        suggestedCompensation: { amountMinor: 150000, currency: "ARS", unit: "minor" },
      },
    };
    const onGetClaim = vi.fn(async () => detailResult(resolvedClaim));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    expect(await screen.findByRole("heading", { name: "Dictamen" })).toBeInTheDocument();
    expect(screen.getByText("A favor del consumidor")).toBeInTheDocument();
    expect(screen.getByText("La evidencia confirma que la reparación dañó la instalación.")).toBeInTheDocument();
    expect(screen.getByText("Compensación sugerida")).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
    expect(screen.queryByText(/pagad[ao]/i)).not.toBeInTheDocument();
    expect(screen.getByText("Resuelto").parentElement?.querySelector("time")).toHaveAttribute("dateTime", resolvedClaim.closedOn);
  });

  it("shows a recoverable error and retries the selected claim", async () => {
    const onGetClaim = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, error: "unavailable" } satisfies ClaimActionResult<ClaimDetail>)
      .mockResolvedValueOnce(detailResult(claimDetail));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar el detalle del reclamo.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("El trabajo causó daños en la cocina.")).toBeInTheDocument();
    await waitFor(() => expect(onGetClaim).toHaveBeenCalledTimes(2));
  });

  it("closes the dialog when requested", async () => {
    const onClose = vi.fn();
    const onGetClaim = vi.fn(async () => detailResult(claimDetail));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={onClose} onGetClaim={onGetClaim} />);
    await screen.findByText("El trabajo causó daños en la cocina.");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders private evidence directly without exposing its URL as a link or referrer", async () => {
    const privateImageUrl = "https://private.example.test/claims/evidence/signed-token";
    const detailWithImage: ClaimDetail = {
      ...claimDetail,
      images: [{ fileId: "evidence-01", url: privateImageUrl }],
    };
    const onGetClaim = vi.fn(async () => detailResult(detailWithImage));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    const image = await screen.findByRole("img", { name: "Imagen de evidencia 1" });
    expect(image).toHaveAttribute("src", privateImageUrl);
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(privateImageUrl)).not.toBeInTheDocument();
  });

  it("renews the full detail when an evidence image fails and replaces its temporary URL", async () => {
    const expiredUrl = "https://private.example.test/claims/evidence/expired";
    const renewedUrl = "https://private.example.test/claims/evidence/renewed";
    const expiredDetail: ClaimDetail = {
      ...claimDetail,
      images: [{ fileId: "evidence-01", url: expiredUrl }],
    };
    const renewedDetail: ClaimDetail = {
      ...expiredDetail,
      images: [{ fileId: "evidence-01", url: renewedUrl }],
    };
    const onGetClaim = vi.fn()
      .mockResolvedValueOnce(detailResult(expiredDetail))
      .mockResolvedValueOnce(detailResult(renewedDetail));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    const expiredImage = await screen.findByRole("img", { name: "Imagen de evidencia 1" });
    fireEvent.error(expiredImage);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar esta imagen.");
    fireEvent.click(screen.getByRole("button", { name: "Renovar acceso" }));

    const renewedImage = await screen.findByRole("img", { name: "Imagen de evidencia 1" });
    expect(renewedImage).toHaveAttribute("src", renewedUrl);
    expect(screen.getByText("El trabajo causó daños en la cocina.")).toBeInTheDocument();
    expect(onGetClaim).toHaveBeenCalledTimes(2);
    expect(onGetClaim).toHaveBeenLastCalledWith(321);
  });

  it("refuses evidence URLs outside HTTP or HTTPS and still offers renewal", async () => {
    const unsafeUrl = "javascript:alert(1)";
    const unsafeDetail: ClaimDetail = {
      ...claimDetail,
      images: [{ fileId: "evidence-01", url: unsafeUrl }],
    };
    const safeDetail: ClaimDetail = {
      ...claimDetail,
      images: [{ fileId: "evidence-01", url: "https://private.example.test/claims/evidence/renewed" }],
    };
    const onGetClaim = vi.fn()
      .mockResolvedValueOnce(detailResult(unsafeDetail))
      .mockResolvedValueOnce(detailResult(safeDetail));

    render(<ParticipantClaimDetailDialog claimId={321} onClose={vi.fn()} onGetClaim={onGetClaim} />);

    expect(await screen.findByText("No pudimos cargar esta imagen. Podés renovar el acceso.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(unsafeUrl)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Renovar acceso" }));

    expect(await screen.findByRole("img", { name: "Imagen de evidencia 1" })).toHaveAttribute(
      "src",
      safeDetail.images[0].url,
    );
  });
});
