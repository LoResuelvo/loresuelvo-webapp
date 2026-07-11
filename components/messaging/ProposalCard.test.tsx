import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ProposalCard } from "./ProposalCard";
import { ServiceProposalSummary } from "@/domain/messaging/types";

const mockConsumerLookingAtProvider: ServiceProposalSummary = {
  id: 1,
  conversationId: 42,
  amountCents: 1500050,
  scheduledOn: "2026-07-05T09:30:00Z",
  description: "Reparación de pérdida de agua.",
  status: "pending",
  createdOn: "2026-07-04T10:00:00Z",
  counterpart: {
    id: 5,
    role: "provider",
    name: "Juan",
    surname: "Gómez",
    categoryName: "Plomería",
    profilePhotoUrl: "https://example.com/photo.jpg",
  },
};

const mockProviderLookingAtConsumer: ServiceProposalSummary = {
  id: 2,
  conversationId: 43,
  amountCents: 500000,
  scheduledOn: "2026-07-06T10:00:00Z",
  description: "Revisión eléctrica",
  status: "accepted",
  createdOn: "2026-07-04T10:00:00Z",
  counterpart: {
    id: 6,
    role: "consumer",
    name: "Ana",
    surname: "Pérez",
  },
};

describe("ProposalCard", () => {
  it("renders correctly for a consumer looking at a provider proposal", () => {
    render(<ProposalCard proposal={mockConsumerLookingAtProvider} isProvider={false} />);
    
    expect(screen.getByText("Juan Gómez")).toBeDefined();
    expect(screen.getByText("Plomería")).toBeDefined();
    expect(screen.getByText("Pendiente")).toBeDefined();
    expect(screen.getByText("$ 15.000,50")).toBeDefined();
    expect(screen.getByTestId("proposal-description").textContent).toBe("Reparación de pérdida de agua.");
    expect(screen.getByTestId("proposal-card-avatar")).toBeDefined();
  });

  it("renders correctly for a provider looking at a consumer proposal (no category)", () => {
    render(<ProposalCard proposal={mockProviderLookingAtConsumer} isProvider={true} />);
    
    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(screen.queryByTestId("proposal-category")).toBeNull();
    expect(screen.getByText("Aceptada")).toBeDefined();
    expect(screen.getByText("$ 5.000,00")).toBeDefined();
  });

  it("calls onViewConversation when the button is clicked", () => {
    const handleView = vi.fn();
    render(
      <ProposalCard 
        proposal={mockConsumerLookingAtProvider} 
        isProvider={false} 
        onViewConversation={handleView} 
      />
    );
    
    const button = screen.getByRole("button", { name: /ver conversación/i });
    fireEvent.click(button);
    
    expect(handleView).toHaveBeenCalledWith(42);
  });

  it("does not render the button if onViewConversation is not provided", () => {
    render(<ProposalCard proposal={mockConsumerLookingAtProvider} isProvider={false} />);
    expect(screen.queryByRole("button", { name: /ver conversación/i })).toBeNull();
  });
});
