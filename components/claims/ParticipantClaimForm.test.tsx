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
});
