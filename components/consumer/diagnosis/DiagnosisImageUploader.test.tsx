import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiagnosisImageUploader } from "./DiagnosisImageUploader";
import React from "react";

global.URL.createObjectURL = vi.fn(() => "blob:https://loresuelvo.com/mock-blob");

describe("DiagnosisImageUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file input and previews when files are present", () => {
    const fileRef = React.createRef<HTMLInputElement>();
    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const handleRemove = vi.fn();
    const handlePreview = vi.fn();

    render(
      <DiagnosisImageUploader
        attachedFiles={[file]}
        fileInputRef={fileRef}
        onFileChange={vi.fn()}
        onRemoveFile={handleRemove}
        onPreviewImage={handlePreview}
      />
    );

    expect(screen.getByAltText("Vista previa de foto.jpg")).toBeInTheDocument();

    const previewButton = screen.getByAltText("Vista previa de foto.jpg").closest("button");
    if (previewButton) {
      fireEvent.click(previewButton);
      expect(handlePreview).toHaveBeenCalledTimes(1);
    }

    const removeButton = screen.getByRole("button", { name: "Eliminar foto.jpg" });
    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalledWith(0);
  });
});
