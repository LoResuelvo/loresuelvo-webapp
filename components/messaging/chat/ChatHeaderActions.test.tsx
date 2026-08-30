import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatHeaderActions from "./ChatHeaderActions";

describe("ChatHeaderActions", () => {
  it("renders pending proposal chip and calls onOpenProposal when clicked", () => {
    const handleOpenProposal = vi.fn();
    render(
      <ChatHeaderActions
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
      />
    );

    const chip = screen.getByRole("button", { name: /ver propuesta de servicio pendiente/i });
    expect(chip).toBeInTheDocument();
    expect(screen.getByText("$ 30.000,00")).toBeInTheDocument();

    fireEvent.click(chip);
    expect(handleOpenProposal).toHaveBeenCalledTimes(1);
  });

  it("renders loading state when isLoadingJobRequest is true", () => {
    render(
      <ChatHeaderActions
        conversationState={{
          pending: false,
          isLoadingJobRequest: true,
        }}
      />
    );

    expect(screen.getByRole("button", { name: /ver solicitud/i })).toBeDisabled();
  });

  it("renders view job request button and calls onViewJobRequest", () => {
    const handleViewJobRequest = vi.fn();
    render(
      <ChatHeaderActions
        conversationState={{
          pending: false,
        }}
        jobRequest={{
          title: "Reparación",
          description: "Descripción",
        }}
        actions={{
          onViewJobRequest: handleViewJobRequest,
        }}
      />
    );

    const button = screen.getByRole("button", { name: /ver solicitud/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleViewJobRequest).toHaveBeenCalledTimes(1);
  });

  it("renders accept button when pending and onAccept provided", () => {
    const handleAccept = vi.fn();
    render(
      <ChatHeaderActions
        conversationState={{
          pending: true,
        }}
        actions={{
          onAccept: handleAccept,
        }}
      />
    );

    const button = screen.getByRole("button", { name: /ver solicitud/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleAccept).toHaveBeenCalledTimes(1);
  });
});
