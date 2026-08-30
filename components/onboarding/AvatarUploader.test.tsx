import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvatarUploader } from "./AvatarUploader";

if (typeof window !== "undefined") {
  window.URL.createObjectURL = vi.fn(() => "blob:mock-avatar-url");
}

describe("AvatarUploader", () => {
  it("renders upload icon when no photo is selected", () => {
    render(<AvatarUploader onPhotoSelected={vi.fn()} />);

    expect(screen.getByText("Subir")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-photo-preview")).not.toBeInTheDocument();
  });

  it("updates preview and calls onPhotoSelected when file selected", () => {
    const onPhotoSelected = vi.fn();
    render(<AvatarUploader onPhotoSelected={onPhotoSelected} />);

    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByTestId("profile-photo-preview")).toBeInTheDocument();
    expect(onPhotoSelected).toHaveBeenCalledWith(file);
  });

  it("displays error message when error prop is provided", () => {
    render(<AvatarUploader onPhotoSelected={vi.fn()} error="La foto de perfil es obligatoria" />);

    expect(screen.getByText("La foto de perfil es obligatoria")).toBeInTheDocument();
  });
});
