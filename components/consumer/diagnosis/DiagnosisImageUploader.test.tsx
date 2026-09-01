import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiagnosisImageUploader } from "./DiagnosisImageUploader";
import React from "react";
import type { InitialDiagnosisAttachment } from "./attachments/initial-diagnosis-attachment";

describe("DiagnosisImageUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file input and previews when attachments are present", () => {
    const fileRef = React.createRef<HTMLInputElement>();
    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const attachment: InitialDiagnosisAttachment = {
      id: "att-id-1",
      file,
      previewUrl: "blob:https://loresuelvo.com/mock-blob-1",
      status: "selected",
    };
    const handleRemove = vi.fn();
    const handlePreview = vi.fn();

    render(
      <DiagnosisImageUploader
        attachments={[attachment]}
        fileInputRef={fileRef}
        onFileChange={vi.fn()}
        onRemoveAttachment={handleRemove}
        onPreviewImage={handlePreview}
      />
    );

    expect(screen.getByAltText("Vista previa de foto.jpg")).toBeInTheDocument();

    const previewButton = screen.getByAltText("Vista previa de foto.jpg").closest("button");
    if (previewButton) {
      fireEvent.click(previewButton);
      expect(handlePreview).toHaveBeenCalledWith({
        url: "blob:https://loresuelvo.com/mock-blob-1",
        name: "foto.jpg",
      });
    }

    const removeButton = screen.getByRole("button", { name: "Eliminar foto.jpg" });
    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalledWith("att-id-1");
  });

  it("renders uploading spinner indicator when attachment is uploading", () => {
    const fileRef = React.createRef<HTMLInputElement>();
    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const attachment: InitialDiagnosisAttachment = {
      id: "att-id-1",
      file,
      previewUrl: "blob:https://loresuelvo.com/mock-blob-1",
      status: "uploading",
    };

    render(
      <DiagnosisImageUploader
        attachments={[attachment]}
        fileInputRef={fileRef}
        onFileChange={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onPreviewImage={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Cargando imagen")).toBeInTheDocument();
  });

  it("renders failure indicator when attachment failed", () => {
    const fileRef = React.createRef<HTMLInputElement>();
    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const attachment: InitialDiagnosisAttachment = {
      id: "att-id-1",
      file,
      previewUrl: "blob:https://loresuelvo.com/mock-blob-1",
      status: "failed",
      error: "Error al subir",
    };

    render(
      <DiagnosisImageUploader
        attachments={[attachment]}
        fileInputRef={fileRef}
        onFileChange={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onPreviewImage={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Error al cargar imagen")).toBeInTheDocument();
  });
});
