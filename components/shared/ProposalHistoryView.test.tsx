import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProposalHistoryView } from "@/components/shared/ProposalHistoryView";

const mockProposals = [
  {
    id: 1,
    conversationId: 2,
    amountCents: 1500000,
    scheduledOn: "2026-07-05T09:30:00-03:00",
    description: "Reparación",
    status: "pending" as const,
    createdOn: "2026-07-04T10:00:00-03:00",
    counterpart: { id: 1, role: "consumer" as const, name: "Juan", surname: "Gómez" }
  },
  {
    id: 2,
    conversationId: 3,
    amountCents: 2000000,
    scheduledOn: "2026-07-06T10:00:00-03:00",
    description: "Pintura",
    status: "accepted" as const,
    createdOn: "2026-07-05T10:00:00-03:00",
    counterpart: { id: 2, role: "consumer" as const, name: "Ana", surname: "Pérez" }
  }
];

describe("ProposalHistoryView", () => {
  it("renders tabs and section title", () => {
    render(<ProposalHistoryView proposals={[]} isProvider={true} />);
    expect(screen.getByText("Propuestas de Servicio")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendientes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Aceptadas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rechazadas" })).toBeInTheDocument();
  });

  it("renders empty state when no proposals match the tab", () => {
    render(<ProposalHistoryView proposals={[]} isProvider={true} />);
    expect(screen.getByText("No tenés propuestas de servicio")).toBeInTheDocument();
  });

  it("renders proposals matching the default pending tab", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);
    expect(screen.getByText("Juan Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Ana Pérez")).not.toBeInTheDocument();
  });

  it("filters proposals when clicking tabs", () => {
    render(<ProposalHistoryView proposals={mockProposals} isProvider={true} />);
    
    const acceptedTab = screen.getByRole("tab", { name: "Aceptadas" });
    fireEvent.click(acceptedTab);
    
    expect(screen.queryByText("Juan Gómez")).not.toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });
});
