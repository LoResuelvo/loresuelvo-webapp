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

  it("renders a microphone icon when lastMessage is an audio preview", () => {
    const { container } = render(
      <ContactItem
        id="conv-1"
        providerId="1"
        providerName="Juan"
        providerSurname="Perez"
        lastMessage="Audio · 0:18"
        lastMessageAt="10:00"
        pending={false}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    const micIcon = container.querySelector("svg.lucide-mic");
    expect(micIcon).toBeInTheDocument();
    expect(screen.getByText("Audio · 0:18")).toBeInTheDocument();
  });

  it("renders a video icon when lastMessage is a video preview", () => {
    const { container } = render(
      <ContactItem
        id="conv-1"
        providerId="1"
        providerName="Juan"
        providerSurname="Perez"
        lastMessage="Video · 0:17"
        lastMessageAt="10:00"
        pending={false}
        isSelected={false}
        onClick={vi.fn()}
      />
    );

    const videoIcon = container.querySelector("svg.lucide-video");
    expect(videoIcon).toBeInTheDocument();
    expect(screen.getByText("Video · 0:17")).toBeInTheDocument();
  });
});
