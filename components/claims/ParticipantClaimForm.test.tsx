import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipantClaimForm } from "./ParticipantClaimForm";
import type { ClaimAcknowledgment, ClaimReferenceOption } from "@/domain/claim/types";
import { executeFileUpload } from "@/application/files/execute-file-upload";

vi.mock("@/application/files/execute-file-upload", () => ({
  executeFileUpload: vi.fn(),
}));

const referenceOptions: ClaimReferenceOption[] = [{
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

function renderForm(onCreateClaim = vi.fn().mockResolvedValue({ ok: true, data: acknowledgment })) {
  render(<ParticipantClaimForm references={referenceOptions} onCreateClaim={onCreateClaim} />);
  return onCreateClaim;
}

function enterValidDetails() {
  fireEvent.change(screen.getByTestId("claim-reference"), { target: { value: "job_request:47" } });
  fireEvent.change(screen.getByTestId("claim-reason"), { target: { value: "damage" } });
  fireEvent.change(screen.getByTestId("claim-description"), { target: { value: "El trabajo causó daños." } });
}

describe("ParticipantClaimForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates required fields and associates the error with the first invalid control", async () => {
    const createClaim = renderForm();

    fireEvent.click(screen.getByTestId("claim-submit"));

    const reference = screen.getByTestId("claim-reference");
    expect(reference).toHaveAttribute("aria-invalid", "true");
    expect(reference).toHaveAttribute("aria-describedby", "claim-form-error");
    expect(await screen.findByRole("alert")).toHaveTextContent("Seleccioná la operación");
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("submits the selected operation and displays the server acknowledgment", async () => {
    const createClaim = renderForm();
    enterValidDetails();

    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Reclamo #321 creado");
    expect(screen.getByTestId("claim-confirmation")).toHaveTextContent("Estado: Abierto");
    expect(screen.getByTestId("claim-confirmation")).toHaveTextContent("Operación: jr-47");
    expect(screen.getByTestId("claim-confirmation")).toHaveTextContent("Reparar una pérdida en la cocina.");
    expect(screen.getByTestId("claim-confirmation")).not.toHaveTextContent("Cambiar servicio");
    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: { kind: "job_request", id: 47 },
        reason: "damage",
        description: "El trabajo causó daños.",
        imageFileIds: [],
      }),
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
  });

  it("uploads evidence before submission and includes only confirmed private file IDs", async () => {
    vi.mocked(executeFileUpload).mockResolvedValue({
      fileId: "550e8400-e29b-41d4-a716-446655440031",
      url: "",
      originalName: "evidencia.png",
    });
    const createClaim = renderForm();
    const file = new File(["png"], "evidencia.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("claim-evidence"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("Imagen cargada")).toBeInTheDocument());
    enterValidDetails();

    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Evidencia vinculada: 1 imagen");
    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({ imageFileIds: ["550e8400-e29b-41d4-a716-446655440031"] }),
      expect.any(String),
    );
  });

  it("keeps failed evidence and its testimony available for retry or removal", async () => {
    vi.mocked(executeFileUpload).mockRejectedValue(new Error("Upload failed"));
    renderForm();
    const file = new File(["png"], "evidencia.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("claim-evidence"), { target: { files: [file] } });
    expect(await screen.findByTestId("claim-upload-error")).toHaveTextContent(/reintentar.*quitá la imagen/i);
    enterValidDetails();

    fireEvent.click(screen.getByTestId("claim-submit"));

    await waitFor(() => expect(executeFileUpload).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId("claim-upload-error")).toBeInTheDocument();
    expect(screen.getByTestId("claim-description")).toHaveValue("El trabajo causó daños.");
    expect(screen.queryByTestId("claim-confirmation")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("claim-evidence-remove-0"));
    await waitFor(() => expect(screen.queryByTestId("claim-upload-error")).not.toBeInTheDocument());
  });

  it("reuses one key for a normalized retry and shows the replay's current status", async () => {
    const lowerEvidenceId = "00000000-0000-4000-8000-000000000001";
    const higherEvidenceId = "f0000000-0000-4000-8000-000000000001";
    vi.mocked(executeFileUpload).mockImplementation(async (_repository, request) => ({
      fileId: request.originalName === "first.png" ? higherEvidenceId : lowerEvidenceId,
      url: "",
      originalName: request.originalName,
    }));
    const createClaim = vi.fn()
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({
        ok: true,
        data: { ...acknowledgment, status: "in_review" },
      });
    renderForm(createClaim);
    enterValidDetails();
    fireEvent.change(screen.getByTestId("claim-description"), {
      target: { value: "\n  El trabajo causó daños.\t " },
    });
    fireEvent.change(screen.getByTestId("claim-evidence"), {
      target: {
        files: [
          new File(["first"], "first.png", { type: "image/png" }),
          new File(["second"], "second.png", { type: "image/png" }),
        ],
      },
    });
    await waitFor(() => expect(screen.getAllByText("Imagen cargada")).toHaveLength(2));

    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos enviar el reclamo");
    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Estado: En revisión");
    expect(createClaim).toHaveBeenCalledTimes(2);
    for (const [submission] of createClaim.mock.calls) {
      expect(submission).toEqual(expect.objectContaining({
        description: "El trabajo causó daños.",
        imageFileIds: [lowerEvidenceId, higherEvidenceId],
      }));
    }
    expect(createClaim.mock.calls[0][1]).toBe(createClaim.mock.calls[1][1]);
  });

  it("shows an unfinished-claim conflict and preserves the entered submission", async () => {
    const createClaim = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      error: "unfinished_claim",
    });
    renderForm(createClaim);
    enterValidDetails();

    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya tenés un reclamo en curso sobre esta operación.",
    );
    expect(screen.getByTestId("claim-description")).toHaveValue("El trabajo causó daños.");
    expect(screen.getByTestId("claim-reference")).toHaveValue("job_request:47");
    expect(screen.queryByTestId("claim-confirmation")).not.toBeInTheDocument();
  });

  it("starts a new claim with a fresh key and fresh evidence after confirmation", async () => {
    const previousEvidenceId = "00000000-0000-4000-8000-000000000011";
    const newEvidenceId = "00000000-0000-4000-8000-000000000012";
    vi.mocked(executeFileUpload).mockImplementation(async (_repository, request) => ({
      fileId: request.originalName === "previous.png" ? previousEvidenceId : newEvidenceId,
      url: "",
      originalName: request.originalName,
    }));
    const createClaim = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: acknowledgment })
      .mockResolvedValueOnce({ ok: true, data: { ...acknowledgment, id: 322 } });
    renderForm(createClaim);
    enterValidDetails();
    fireEvent.change(screen.getByTestId("claim-evidence"), {
      target: { files: [new File(["previous"], "previous.png", { type: "image/png" })] },
    });
    await screen.findByText("Imagen cargada");
    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Reclamo #321 creado");
    const firstKey = createClaim.mock.calls[0][1];

    fireEvent.click(screen.getByRole("button", { name: "Presentar otro reclamo" }));

    expect(screen.getByTestId("claim-reference")).toHaveValue("job_request:47");
    expect(screen.getByTestId("claim-reason")).toHaveValue("");
    expect(screen.getByTestId("claim-description")).toHaveValue("");
    expect(screen.queryByText("previous.png")).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("claim-evidence"), {
      target: { files: [new File(["new"], "new.png", { type: "image/png" })] },
    });
    await screen.findByText("Imagen cargada");
    enterValidDetails();
    fireEvent.change(screen.getByTestId("claim-description"), {
      target: { value: "El problema volvió a ocurrir." },
    });
    fireEvent.click(screen.getByTestId("claim-submit"));

    expect(await screen.findByTestId("claim-confirmation")).toHaveTextContent("Reclamo #322 creado");
    expect(createClaim.mock.calls[0][0].imageFileIds).toEqual([previousEvidenceId]);
    expect(createClaim.mock.calls[1][0].imageFileIds).toEqual([newEvidenceId]);
    expect(createClaim.mock.calls[1][1]).not.toBe(firstKey);
  });

  it("displays typed errors for references without collapsing into an empty list", () => {
    const { rerender } = render(
      <ParticipantClaimForm references={[]} referencesError="unauthenticated" onCreateClaim={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Tu sesión venció. Iniciá sesión y volvé a intentar.");
    expect(screen.queryByText("No encontramos operaciones pendientes disponibles para reclamar.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("claim-submit")).not.toBeInTheDocument();

    rerender(
      <ParticipantClaimForm references={[]} referencesError="forbidden" onCreateClaim={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Tu cuenta todavía no puede presentar reclamos.");

    rerender(
      <ParticipantClaimForm references={[]} referencesError="not_found" onCreateClaim={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("La operación ya no está disponible para reclamar.");

    rerender(
      <ParticipantClaimForm references={[]} referencesError="unavailable" onCreateClaim={vi.fn()} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus operaciones. Actualizá la página para volver a intentar.");
  });

  it("focuses the first invalid field upon submission and focuses reference upon restart", async () => {
    const createClaim = vi.fn().mockResolvedValue({ ok: true, data: acknowledgment });
    render(<ParticipantClaimForm references={referenceOptions} onCreateClaim={createClaim} />);

    // 1. Submit without reference -> focuses reference
    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(document.activeElement).toBe(screen.getByTestId("claim-reference"));

    // 2. Select reference, submit without reason -> focuses reason
    fireEvent.change(screen.getByTestId("claim-reference"), { target: { value: "job_request:47" } });
    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(document.activeElement).toBe(screen.getByTestId("claim-reason"));

    // 3. Select reason, submit without description -> focuses description
    fireEvent.change(screen.getByTestId("claim-reason"), { target: { value: "damage" } });
    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(document.activeElement).toBe(screen.getByTestId("claim-description"));

    // 4. Fill description and submit successfully
    fireEvent.change(screen.getByTestId("claim-description"), { target: { value: "Descripción válida" } });
    fireEvent.click(screen.getByTestId("claim-submit"));
    expect(await screen.findByTestId("claim-confirmation")).toBeInTheDocument();

    // 5. Restart -> focuses reference
    fireEvent.click(screen.getByRole("button", { name: "Presentar otro reclamo" }));
    expect(document.activeElement).toBe(screen.getByTestId("claim-reference"));
  });
});
