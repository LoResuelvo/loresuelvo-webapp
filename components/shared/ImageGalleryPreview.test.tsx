import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageGalleryPreview } from "./ImageGalleryPreview";

describe("ImageGalleryPreview", () => {
  const mockImages = [
    { id: "img-1", url: "http://example.com/img1.jpg", originalName: "leak.jpg" },
    { id: "img-2", url: "http://example.com/img2.jpg", originalName: "siphon.jpg" },
  ];

  it("renders null when no images are provided", () => {
    const { container } = render(
      <ImageGalleryPreview label="Imágenes adjuntas" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when images list is empty", () => {
    const { container } = render(
      <ImageGalleryPreview images={[]} label="Imágenes adjuntas" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders thumbnails and label when images are provided", () => {
    render(
      <ImageGalleryPreview images={mockImages} label="Imágenes adjuntas" />
    );

    expect(screen.getByText("Imágenes adjuntas")).toBeInTheDocument();
    expect(screen.getByAltText("leak.jpg")).toBeInTheDocument();
    expect(screen.getByAltText("siphon.jpg")).toBeInTheDocument();
  });

  it("opens full preview modal when clicking on a thumbnail", () => {
    render(
      <ImageGalleryPreview images={mockImages} label="Imágenes adjuntas" />
    );

    const thumbnail = screen.getByAltText("leak.jpg");
    fireEvent.click(thumbnail);


    const previewImg = screen.getAllByAltText(/Vista previa de imagen leak.jpg/i);
    expect(previewImg.length).toBeGreaterThan(0);
  });
});
