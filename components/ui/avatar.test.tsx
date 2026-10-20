import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("falls back accessibly and ignores errors from a previous source", () => {
    const { rerender } = render(
      <Avatar
        src="https://example.com/first-photo.jpg"
        alt="Foto de María"
        imgTestId="avatar-photo"
        fallbackTestId="avatar-fallback"
      />,
    );
    const firstImage = screen.getByTestId("avatar-photo");

    rerender(
      <Avatar
        src="https://example.com/second-photo.jpg"
        alt="Foto de Ana"
        imgTestId="avatar-photo"
        fallbackTestId="avatar-fallback"
      />,
    );

    const secondImage = screen.getByTestId("avatar-photo");
    fireEvent.error(firstImage);
    expect(screen.getByTestId("avatar-photo")).toHaveAttribute(
      "src",
      "https://example.com/second-photo.jpg",
    );

    fireEvent.error(secondImage);

    expect(screen.queryByTestId("avatar-photo")).not.toBeInTheDocument();
    expect(screen.getByTestId("avatar-fallback")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto de Ana" })).toBeInTheDocument();

    rerender(
      <Avatar
        src="https://example.com/third-photo.jpg"
        alt="Foto de Ana"
        imgTestId="avatar-photo"
        fallbackTestId="avatar-fallback"
      />,
    );
    const thirdImage = screen.getByTestId("avatar-photo");
    expect(thirdImage).toHaveAttribute("src", "https://example.com/third-photo.jpg");

    fireEvent.error(secondImage);

    expect(screen.getByTestId("avatar-photo")).toHaveAttribute(
      "src",
      "https://example.com/third-photo.jpg",
    );
  });

  it("falls back when the image was already broken before its handler attached", () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    const naturalWidth = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(0);

    try {
      render(
        <Avatar
          src="https://example.com/broken-photo.jpg"
          alt="Foto de María"
          imgTestId="avatar-photo"
          fallbackTestId="avatar-fallback"
        />,
      );

      expect(screen.queryByTestId("avatar-photo")).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Foto de María" })).toBeInTheDocument();
    } finally {
      complete.mockRestore();
      naturalWidth.mockRestore();
    }
  });

  it("keeps the current fallback when a detached earlier source errors later", () => {
    const { rerender } = render(
      <Avatar
        src="https://example.com/pending-photo.jpg"
        alt="Foto de María"
        imgTestId="avatar-photo"
        fallbackTestId="avatar-fallback"
      />,
    );
    const pendingImage = screen.getByTestId("avatar-photo");

    rerender(
      <Avatar
        src="https://example.com/current-photo.jpg"
        alt="Foto de Ana"
        imgTestId="avatar-photo"
        fallbackTestId="avatar-fallback"
      />,
    );
    fireEvent.error(screen.getByTestId("avatar-photo"));
    expect(screen.getByRole("img", { name: "Foto de Ana" })).toBeInTheDocument();

    fireEvent.error(pendingImage);

    expect(screen.queryByTestId("avatar-photo")).not.toBeInTheDocument();
    expect(screen.getByTestId("avatar-fallback")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto de Ana" })).toBeInTheDocument();
  });
});
