import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThumbnailGrid } from "./ThumbnailGrid";

if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

describe("ThumbnailGrid", () => {
  it("renders nothing when files array is empty", () => {
    const { container } = render(
      <ThumbnailGrid files={[]} onPreview={vi.fn()} onRemove={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders thumbnails and handles preview click", () => {
    const file = new File(["a"], "photo.png", { type: "image/png" });
    const handlePreview = vi.fn();
    const handleRemove = vi.fn();

    render(
      <ThumbnailGrid files={[file]} onPreview={handlePreview} onRemove={handleRemove} />
    );

    const previewBtn = screen.getByAltText(/photo.png/i);
    expect(previewBtn).toBeInTheDocument();

    fireEvent.click(previewBtn);
    expect(handlePreview).toHaveBeenCalledWith(file);
  });

  it("handles remove button click", () => {
    const file = new File(["a"], "photo.png", { type: "image/png" });
    const handleRemove = vi.fn();

    render(
      <ThumbnailGrid files={[file]} onPreview={vi.fn()} onRemove={handleRemove} />
    );

    const removeBtn = screen.getByRole("button", { name: /Eliminar photo.png/i });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith(0);
  });
});
