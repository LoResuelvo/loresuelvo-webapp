import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProposalTimelineActions from "./ProposalTimelineActions";
import type { ServiceProposalSummary } from "@/domain/messaging/types";

const mockProposal: ServiceProposalSummary = {
  id: 42,
  conversationId: 10,
  amountCents: 3000000,
  scheduledOn: "2026-09-01T15:00:00Z",
  description: "Reparación",
  estimatedDurationMinutes: 60,
  status: "pending",
  createdOn: "2026-08-18T14:22:00Z",
  counterpart: {
    id: 5,
    role: "provider",
    name: "Juan",
    surname: "Pérez",
  },
};

describe("ProposalTimelineActions", () => {
  it("renders 'Revisar y pagar seña' for consumer when pending", () => {
    render(
      <ProposalTimelineActions
        proposal={mockProposal}
        isProvider={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /revisar y pagar seña/i })).toBeInTheDocument();
  });

  it("renders 'Ver propuesta enviada' for provider when pending", () => {
    render(
      <ProposalTimelineActions
        proposal={mockProposal}
        isProvider={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /ver propuesta enviada/i })).toBeInTheDocument();
  });

  it("renders 'Ver propuesta aceptada' when accepted", () => {
    render(
      <ProposalTimelineActions
        proposal={{ ...mockProposal, status: "accepted" }}
        isProvider={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /ver propuesta aceptada/i })).toBeInTheDocument();
  });

  it("renders 'Ver propuesta rechazada' when rejected", () => {
    render(
      <ProposalTimelineActions
        proposal={{ ...mockProposal, status: "rejected" }}
        isProvider={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /ver propuesta rechazada/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(
      <ProposalTimelineActions
        proposal={mockProposal}
        isProvider={false}
        onClick={handleClick}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
