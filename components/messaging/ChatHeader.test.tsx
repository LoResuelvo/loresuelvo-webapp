import { render, screen, fireEvent } from "@testing-library/react";
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

  it("shows Ver Solicitud button when jobRequest is present", () => {
    render(
      <ChatHeader
        providerName="Juan"
        providerSurname="Perez"
        pending={false}
        jobRequest={{
          title: "Reparación",
          description: "Necesito reparar algo",
          providerName: "Juan",
          providerSurname: "Perez",
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Ver solicitud de trabajo" })).toBeInTheDocument();
  });

  it("opens JobRequestPanel with provider photo when clicking Ver Solicitud", () => {
    render(
      <ChatHeader
        providerName="Juan"
        providerSurname="Perez"
        pending={false}
        profilePhotoUrl="https://example.com/provider-photo.jpg"
        jobRequest={{
          title: "Reparación",
          description: "Necesito reparar algo",
          providerName: "Juan",
          providerSurname: "Perez",
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver solicitud de trabajo" }));

    const providerImage = screen.getByRole("img", { name: /foto de juan/i });
    expect(providerImage).toBeInTheDocument();
    expect(providerImage).toHaveAttribute("src", "https://example.com/provider-photo.jpg");
  });
});
