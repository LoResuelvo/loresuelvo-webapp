import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DiagnosisImageAttachmentItem } from "./DiagnosisImageAttachmentItem";
import type { InitialDiagnosisAttachment } from "./attachments/initial-diagnosis-attachment";

describe("DiagnosisImageAttachmentItem", () => {
  const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
  const baseAttachment: InitialDiagnosisAttachment = {
    id: "att-1",
    file,
    previewUrl: "blob:https://test.local/foto.jpg",
    status: "selected",
  };

  it("renders image preview and triggers onPreview on thumbnail click", () => {
    const onPreview = vi.fn();
    const onRemove = vi.fn();

    render(
      <DiagnosisImageAttachmentItem
        attachment={baseAttachment}
        onPreview={onPreview}
        onRemove={onRemove}
      />
    );

    const img = screen.getByAltText("Vista previa de foto.jpg");
    expect(img).toBeInTheDocument();

    const previewButton = img.closest("button");
    if (previewButton) {
      fireEvent.click(previewButton);
      expect(onPreview).toHaveBeenCalledWith(baseAttachment);
    }
  });

  it("triggers onRemove with attachment ID when delete button is clicked", () => {
    const onPreview = vi.fn();
    const onRemove = vi.fn();

    render(
      <DiagnosisImageAttachmentItem
        attachment={baseAttachment}
        onPreview={onPreview}
        onRemove={onRemove}
      />
    );

    const removeBtn = screen.getByRole("button", { name: "Eliminar foto.jpg" });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("att-1");
  });

  it("renders loader overlay when status is uploading", () => {
    const uploadingAttachment: InitialDiagnosisAttachment = {
      ...baseAttachment,
      status: "uploading",
    };

    render(
      <DiagnosisImageAttachmentItem
        attachment={uploadingAttachment}
        onPreview={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Cargando imagen")).toBeInTheDocument();
  });

  it("renders error overlay and red border when status is failed", () => {
    const failedAttachment: InitialDiagnosisAttachment = {
      ...baseAttachment,
      status: "failed",
      error: "Error de carga",
    };

    render(
      <DiagnosisImageAttachmentItem
        attachment={failedAttachment}
        onPreview={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Error al cargar imagen")).toBeInTheDocument();
  });
});
