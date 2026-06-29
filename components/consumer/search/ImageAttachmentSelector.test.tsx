import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImageAttachmentSelector } from "./ImageAttachmentSelector";

// Mock URL.createObjectURL
if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

describe("ImageAttachmentSelector", () => {
  const mockOnChange = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with empty files list", () => {
    render(
      <ImageAttachmentSelector
        files={[]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    expect(screen.getByRole("button", { name: /Adjuntar imágenes \(0\/3\)/i })).toBeInTheDocument();
    expect(screen.getByText("Máximo 3 imágenes permitidas")).toBeInTheDocument();
  });

  it("renders thumbnails for attached files", () => {
    const file1 = new File(["1"], "test1.png", { type: "image/png" });
    const file2 = new File(["2"], "test2.jpg", { type: "image/jpeg" });

    render(
      <ImageAttachmentSelector
        files={[file1, file2]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    expect(screen.getByAltText(/test1.png/i)).toBeInTheDocument();
    expect(screen.getByAltText(/test2.jpg/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adjuntar imágenes \(2\/3\)/i })).toBeInTheDocument();
  });

  it("removes an image when its delete button is clicked", () => {
    const file1 = new File(["1"], "test1.png", { type: "image/png" });
    const file2 = new File(["2"], "test2.jpg", { type: "image/jpeg" });

    render(
      <ImageAttachmentSelector
        files={[file1, file2]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Eliminar test1.png/i });
    fireEvent.click(deleteBtn);

    expect(mockOnChange).toHaveBeenCalledWith([file2]);
    expect(mockOnError).toHaveBeenCalledWith(null);
  });

  it("allows attaching a valid file", () => {
    render(
      <ImageAttachmentSelector
        files={[]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    const file = new File(["dummy content"], "test.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnChange).toHaveBeenCalledWith([file]);
    expect(mockOnError).toHaveBeenCalledWith(null);
  });

  it("shows error and rejects file if it exceeds size limit", () => {
    render(
      <ImageAttachmentSelector
        files={[]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    // Create a file > 5MB
    const largeFile = new File(["a".repeat(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith("La imagen no debe superar los 5MB");
  });

  it("shows error and rejects file if format is invalid", () => {
    render(
      <ImageAttachmentSelector
        files={[]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    const invalidFile = new File(["dummy text"], "document.pdf", { type: "application/pdf" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith(
      "Formato de imagen no permitido. Los formatos permitidos son: PNG, JPG, JPEG y WEBP"
    );
  });

  it("shows error and prevents addition if maximum limit is exceeded", () => {
    const file1 = new File(["1"], "t1.png", { type: "image/png" });
    const file2 = new File(["2"], "t2.png", { type: "image/png" });
    const file3 = new File(["3"], "t3.png", { type: "image/png" });

    render(
      <ImageAttachmentSelector
        files={[file1, file2, file3]}
        onChange={mockOnChange}
        maxFiles={3}
        onError={mockOnError}
      />
    );

    const extraFile = new File(["4"], "t4.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [extraFile] } });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith("Ya alcanzaste el límite de 3 imágenes");
  });
});
