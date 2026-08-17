import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProposalCarousel } from "./ProposalCarousel";
import { Clock } from "lucide-react";
import { ServiceProposalSummary } from "@/domain/messaging/types";

const mockProposals: ServiceProposalSummary[] = [
  {
    id: 1,
    conversationId: 101,
    amountCents: 400000,
    scheduledOn: "2026-08-20T20:30:00-03:00",
    description: "Arreglo de mesa",
    status: "pending",
    createdOn: "2026-08-15T10:00:00-03:00",
    counterpart: { id: 10, role: "provider", name: "Matex", surname: "Laburante", categoryName: "Carpintería" },
  },
  {
    id: 2,
    conversationId: 102,
    amountCents: 850000,
    scheduledOn: "2026-08-22T15:00:00-03:00",
    description: "Instalación de canilla",
    status: "pending",
    createdOn: "2026-08-16T11:00:00-03:00",
    counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Plomero", categoryName: "Plomería" },
  },
];

describe("ProposalCarousel", () => {
  it("renders empty state message when proposals array is empty", () => {
    render(
      <ProposalCarousel
        title="Propuestas Pendientes"
        titleId="pending-title"
        icon={Clock}
        proposals={[]}
        emptyMessage="No tenés propuestas pendientes"
        prevLabel="Anterior"
        nextLabel="Siguiente"
        onViewConversation={vi.fn()}
      />
    );

    expect(screen.getByText("Propuestas Pendientes")).toBeInTheDocument();
    expect(screen.getByText("No tenés propuestas pendientes")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anterior")).not.toBeInTheDocument();
  });

  it("renders single proposal without navigation buttons", () => {
    render(
      <ProposalCarousel
        title="Propuestas Pendientes"
        titleId="pending-title"
        icon={Clock}
        proposals={[mockProposals[0]]}
        emptyMessage="No tenés propuestas pendientes"
        prevLabel="Anterior"
        nextLabel="Siguiente"
        onViewConversation={vi.fn()}
      />
    );

    expect(screen.getByText("Matex Laburante")).toBeInTheDocument();
    expect(screen.queryByLabelText("Anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Siguiente")).not.toBeInTheDocument();
  });

  it("renders multiple proposals with navigation controls and navigates between slides", () => {
    const handleViewConversation = vi.fn();
    render(
      <ProposalCarousel
        title="Propuestas Pendientes"
        titleId="pending-title"
        icon={Clock}
        proposals={mockProposals}
        emptyMessage="No tenés propuestas pendientes"
        prevLabel="Propuesta anterior"
        nextLabel="Siguiente propuesta"
        onViewConversation={handleViewConversation}
      />
    );

    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("Matex Laburante")).toBeInTheDocument();
    expect(screen.getByText("Carlos Plomero")).toBeInTheDocument();

    const nextBtn = screen.getByLabelText("Siguiente propuesta");
    fireEvent.click(nextBtn);

    expect(screen.getByText("2/2")).toBeInTheDocument();

    const prevBtn = screen.getByLabelText("Propuesta anterior");
    fireEvent.click(prevBtn);

    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("navigates directly when clicking pagination dot", () => {
    render(
      <ProposalCarousel
        title="Propuestas Pendientes"
        titleId="pending-title"
        icon={Clock}
        proposals={mockProposals}
        emptyMessage="No tenés propuestas pendientes"
        prevLabel="Propuesta anterior"
        nextLabel="Siguiente propuesta"
        onViewConversation={vi.fn()}
      />
    );

    const secondDot = screen.getByLabelText("Ir a tarjeta 2");
    fireEvent.click(secondDot);

    expect(screen.getByText("2/2")).toBeInTheDocument();
  });
});
