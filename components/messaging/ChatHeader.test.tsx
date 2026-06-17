import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChatHeader from "./ChatHeader";

describe("ChatHeader", () => {
  it("displays the contact's profile photo when profilePhotoUrl is present", () => {
    render(
      <ChatHeader
        providerName="Juan"
        providerSurname="Perez"
        pending={false}
        profilePhotoUrl="https://example.com/photo.jpg"
      />
    );

    const image = screen.getByTestId("chat-header-profile-photo");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("displays the default user icon when profilePhotoUrl is missing", () => {
    const { container } = render(
      <ChatHeader
        providerName="Juan"
        providerSurname="Perez"
        pending={false}
      />
    );

    expect(screen.queryByTestId("chat-header-profile-photo")).not.toBeInTheDocument();
    const svgElement = container.querySelector("svg.lucide-user");
    expect(svgElement).toBeInTheDocument();
  });
});
