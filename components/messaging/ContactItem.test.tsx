import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactItem from "./ContactItem";

describe("ContactItem", () => {
  it("displays the contact's profile photo when profilePhotoUrl is present", () => {
    render(
      <ContactItem
        id="conv-1"
        providerId="1"
        providerName="Juan"
        providerSurname="Perez"
        lastMessage="Hola"
        lastMessageAt="10:00"
        pending={false}
        isSelected={false}
        onClick={vi.fn()}
        profilePhotoUrl="https://example.com/photo.jpg"
      />
    );

    const image = screen.getByTestId("chat-list-profile-photo");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("displays the default user icon when profilePhotoUrl is missing", () => {
    const { container } = render(
      <ContactItem
        id="conv-1"
        providerId="1"
        providerName="Juan"
        providerSurname="Perez"
        lastMessage="Hola"
        lastMessageAt="10:00"
        pending={false}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryByTestId("chat-list-profile-photo")).not.toBeInTheDocument();
    const svgElement = container.querySelector("svg.lucide-user");
    expect(svgElement).toBeInTheDocument();
  });
});
