import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProposalTimelineCard } from "./ProposalTimelineCard";
import type { ServiceProposalSummary } from "@/domain/messaging/types";

const mockProposal: ServiceProposalSummary = {
  id: 42,
  conversationId: 10,
  amountCents: 3000000,
  scheduledOn: "2026-09-01T15:00:00Z",
  description: "Reparación completa de grifería y cañería con repuestos incluidos.",
  status: "pending",
  createdOn: "2026-08-18T14:22:00Z",
  counterpart: {
    id: 5,
    role: "provider",
    name: "Juan",
    surname: "Pérez",
  },
};

describe("ProposalTimelineCard", () => {
  it("renders proposal header, amount and formatted date", () => {
    render(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Propuesta de Servicio")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("$ 30.000,00")).toBeInTheDocument();
    expect(screen.getByText(/01\/09\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Reparación completa/i)).toBeInTheDocument();
  });

  it("renders 'Revisar y pagar seña' button for consumer when pending", () => {
    render(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={false}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /revisar y pagar seña/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Ver propuesta enviada' button for provider when pending", () => {
    render(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={true}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /ver propuesta enviada/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Ver propuesta aceptada' when status is accepted", () => {
    render(
      <ProposalTimelineCard
        proposal={{ ...mockProposal, status: "accepted" }}
        isProvider={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Aceptada")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ver propuesta aceptada/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Ver propuesta rechazada' when status is rejected", () => {
    render(
      <ProposalTimelineCard
        proposal={{ ...mockProposal, status: "rejected" }}
        isProvider={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ver propuesta rechazada/i }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicking the action button", () => {
    const handleClick = vi.fn();
    render(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={false}
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole("button", { name: /revisar y pagar seña/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("aligns card to left for consumer and right for provider", () => {
    const { rerender } = render(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={false}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("service-proposal-panel")).toHaveClass("justify-start");

    rerender(
      <ProposalTimelineCard
        proposal={mockProposal}
        isProvider={true}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId("service-proposal-panel")).toHaveClass("justify-end");
  });
});
