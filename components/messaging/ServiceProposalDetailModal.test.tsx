import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ServiceProposalSummary } from "@/domain/messaging/types";
import ServiceProposalDetailModal from "./ServiceProposalDetailModal";

const proposal: ServiceProposalSummary = {
  id: 42,
  conversationId: 10,
  amountCents: 10_000_000,
  scheduledOn: "2026-09-01T12:00:00Z",
  description: "Reparación",
  status: "pending",
  createdOn: "2026-08-11T12:00:00Z",
  counterpart: {
    id: 7,
    role: "provider",
    name: "Juan",
    surname: "Pérez",
  },
  bookingTerms: {
    currency: "ARS",
    serviceTotalCents: 10_000_000,
    depositCents: 2_000_000,
    remainingServiceBalanceCents: 8_000_000,
    platformFeeTotalCents: 500_000,
    platformFeeDueNowCents: 100_000,
    remainingPlatformFeeCents: 400_000,
    amountDueNowCents: 2_100_000,
    remainingAmountDueCents: 8_400_000,
    contractTotalCents: 10_500_000,
    bookingPaymentDeadline: "2026-08-31T12:00:00Z",
  },
};

describe("ServiceProposalDetailModal payment action", () => {
  it("should show booking deposit payment for a consumer pending proposal", () => {
    render(<ServiceProposalDetailModal proposal={proposal} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pagar reserva" })).toBeInTheDocument();
  });

  it("should not show booking deposit payment to the provider", () => {
    render(
      <ServiceProposalDetailModal
        proposal={{ ...proposal, counterpart: { ...proposal.counterpart, role: "consumer" } }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pagar reserva" })).not.toBeInTheDocument();
  });

  it("should not show booking deposit payment for a non-pending proposal", () => {
    render(
      <ServiceProposalDetailModal
        proposal={{ ...proposal, status: "accepted" }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Pagar reserva" })).not.toBeInTheDocument();
  });

  it("renders 'Ver conversación' button when onViewConversation prop is provided", () => {
    const handleViewConversation = vi.fn();
    render(
      <ServiceProposalDetailModal
        proposal={proposal}
        onClose={vi.fn()}
        onViewConversation={handleViewConversation}
      />
    );

    const button = screen.getByRole("button", { name: /ver conversación/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(handleViewConversation).toHaveBeenCalledWith(10);
  });

  it("does not render 'Ver conversación' button when onViewConversation is not provided", () => {
    render(
      <ServiceProposalDetailModal
        proposal={proposal}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /ver conversación/i })).not.toBeInTheDocument();
  });
});
