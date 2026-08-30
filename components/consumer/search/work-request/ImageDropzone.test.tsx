import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ImageDropzone } from "./ImageDropzone";

describe("ImageDropzone", () => {
  it("renders the attach images button", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<ImageDropzone fileInputRef={ref} onFileChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Adjuntar imágenes/i })).toBeInTheDocument();
  });

  it("clicks the hidden file input when button is clicked", () => {
    const ref = React.createRef<HTMLInputElement>();
    const { container } = render(<ImageDropzone fileInputRef={ref} onFileChange={vi.fn()} />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});

    const button = screen.getByRole("button", { name: /Adjuntar imágenes/i });
    fireEvent.click(button);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("disables button and input when disabled or maxFilesReached is true", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <ImageDropzone
        fileInputRef={ref}
        onFileChange={vi.fn()}
        maxFilesReached={true}
      />
    );

    const button = screen.getByRole("button", { name: /Adjuntar imágenes/i });
    expect(button).toBeDisabled();
  });
});
