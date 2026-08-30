import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatHeader from "./ChatHeader";

describe("ChatHeader", () => {
  it("displays the contact's profile photo when profilePhotoUrl is present", () => {
    render(
      <ChatHeader
        contact={{
          name: "Juan",
          surname: "Perez",
          photoUrl: "https://example.com/photo.jpg",
        }}
        conversationState={{
          pending: false,
        }}
      />
    );

    const image = screen.getByTestId("chat-header-profile-photo");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("displays the default user icon when profilePhotoUrl is missing", () => {
    const { container } = render(
      <ChatHeader
        contact={{
          name: "Juan",
          surname: "Perez",
        }}
        conversationState={{
          pending: false,
        }}
      />
    );

    expect(screen.queryByTestId("chat-header-profile-photo")).not.toBeInTheDocument();
    const svgElement = container.querySelector("svg.lucide-user");
    expect(svgElement).toBeInTheDocument();
  });

  it("shows Ver Solicitud button when jobRequest is present", () => {
    render(
      <ChatHeader
        contact={{
          name: "Juan",
          surname: "Perez",
        }}
        conversationState={{
          pending: false,
        }}
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
        contact={{
          name: "Juan",
          surname: "Perez",
          photoUrl: "https://example.com/provider-photo.jpg",
        }}
        conversationState={{
          pending: false,
        }}
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

  it("shows pending proposal chip when serviceProposal is pending and calls onOpenProposal", () => {
    const handleOpenProposal = vi.fn();
    render(
      <ChatHeader
        contact={{
          name: "Juan",
          surname: "Perez",
        }}
        conversationState={{
          pending: false,
          isProvider: false,
        }}
        serviceProposal={{
          id: 42,
          conversationId: 10,
          amountCents: 3000000,
          scheduledOn: "2026-09-01T15:00:00Z",
          description: "Reparación",
          estimatedDurationMinutes: 60,
          status: "pending",
          createdOn: "2026-08-18T14:00:00Z",
          counterpart: { id: 1, role: "provider", name: "Juan", surname: "Perez" },
        }}
        actions={{
          onOpenProposal: handleOpenProposal,
        }}
      />,
    );

    const chip = screen.getByRole("button", { name: /ver propuesta de servicio pendiente/i });
    expect(chip).toBeInTheDocument();
    expect(screen.getByText("$ 30.000,00")).toBeInTheDocument();

    fireEvent.click(chip);
    expect(handleOpenProposal).toHaveBeenCalledTimes(1);
  });

  it("does not show pending proposal chip when serviceProposal is accepted", () => {
    render(
      <ChatHeader
        contact={{
          name: "Juan",
          surname: "Perez",
        }}
        conversationState={{
          pending: false,
        }}
        serviceProposal={{
          id: 42,
          conversationId: 10,
          amountCents: 3000000,
          scheduledOn: "2026-09-01T15:00:00Z",
          description: "Reparación",
          estimatedDurationMinutes: 60,
          status: "accepted",
          createdOn: "2026-08-18T14:00:00Z",
          counterpart: { id: 1, role: "provider", name: "Juan", surname: "Perez" },
        }}
        actions={{
          onOpenProposal: vi.fn(),
        }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /ver propuesta de servicio pendiente/i }),
    ).not.toBeInTheDocument();
  });
});
