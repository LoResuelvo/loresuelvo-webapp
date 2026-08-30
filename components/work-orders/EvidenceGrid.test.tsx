import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EvidenceGrid } from "./EvidenceGrid";
import { t } from "@/infrastructure/i18n/translations";

describe("EvidenceGrid", () => {
  const images = [
    {
      id: "img-1",
      file: new File(["dummy1"], "foto1.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:mock-1",
    },
    {
      id: "img-2",
      file: new File(["dummy2"], "foto2.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:mock-2",
    },
  ];

  it("renders images with thumbnails and remove buttons", () => {
    render(<EvidenceGrid images={images} onRemove={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Vista previa de foto1.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Vista previa de foto2.jpg" })).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("calls onRemove when clicking remove button", async () => {
    const user = userEvent.setup();
    const handleRemove = vi.fn();

    render(<EvidenceGrid images={images} onRemove={handleRemove} />);

    const removeBtn = screen.getByRole("button", {
      name: `${t.workOrderCompletion.removeImageText} foto1.jpg`,
    });
    await user.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith("img-1");
  });

  it("renders children at the end of the grid", () => {
    render(
      <EvidenceGrid images={images} onRemove={vi.fn()}>
        <div data-testid="child-dropzone">Dropzone</div>
      </EvidenceGrid>
    );

    expect(screen.getByTestId("child-dropzone")).toBeInTheDocument();
  });
});
