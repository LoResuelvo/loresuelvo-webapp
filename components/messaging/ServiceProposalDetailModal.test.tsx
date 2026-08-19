import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ServiceProposalSummary } from "@/domain/messaging/types";
import ServiceProposalDetailModal from "./ServiceProposalDetailModal";
import * as workOrderActions from "@/app/work-orders/actions";
import { t } from "@/infrastructure/i18n/translations";

vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderByProposalAction: vi.fn(),
  reportWorkCompletionAction: vi.fn(),
}));

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

describe("ServiceProposalDetailModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workOrderActions.getWorkOrderByProposalAction).mockResolvedValue({
      ok: true,
      workOrder: {
        id: 10,
        serviceProposalId: 42,
        status: "scheduled",
        amountCents: 10_000_000,
        scheduledOn: "2026-08-01T12:00:00Z",
        description: "Reparación",
        acceptedOn: "2026-08-01T12:00:00Z",
      },
    });
  });

  describe("payment action", () => {
    it("should show booking deposit payment for a consumer pending proposal", () => {
      render(<ServiceProposalDetailModal proposal={proposal} onClose={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Pagar reserva" })).toBeInTheDocument();
    });

    it("should not show booking deposit payment to the provider", () => {
      render(
        <ServiceProposalDetailModal
          proposal={{ ...proposal, counterpart: { ...proposal.counterpart, role: "consumer" } }}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: "Pagar reserva" })).not.toBeInTheDocument();
    });

    it("should not show booking deposit payment for a non-pending proposal", () => {
      render(
        <ServiceProposalDetailModal
          proposal={{ ...proposal, status: "accepted" }}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: "Pagar reserva" })).not.toBeInTheDocument();
    });
  });

  describe("conversation navigation", () => {
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
      render(<ServiceProposalDetailModal proposal={proposal} onClose={vi.fn()} />);

      expect(screen.queryByRole("button", { name: /ver conversación/i })).not.toBeInTheDocument();
    });
  });

  describe("work order completion action (US-26)", () => {
    it("shows 'Informar finalización' button when accepted, viewed by provider and scheduled date is in the past", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const acceptedProposal: ServiceProposalSummary = {
        ...proposal,
        status: "accepted",
        scheduledOn: pastDate,
        counterpart: {
          id: 10,
          role: "consumer",
          name: "María",
          surname: "Fernández",
        },
      };

      render(<ServiceProposalDetailModal proposal={acceptedProposal} onClose={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: t.workOrderCompletion.informCompletionButton })
      ).toBeInTheDocument();
    });

    it("does not show 'Informar finalización' button and shows notice when scheduled date is in the future", () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const futureProposal: ServiceProposalSummary = {
        ...proposal,
        status: "accepted",
        scheduledOn: futureDate,
        counterpart: {
          id: 10,
          role: "consumer",
          name: "María",
          surname: "Fernández",
        },
      };

      render(<ServiceProposalDetailModal proposal={futureProposal} onClose={vi.fn()} />);

      expect(
        screen.queryByRole("button", { name: t.workOrderCompletion.informCompletionButton })
      ).not.toBeInTheDocument();
      expect(screen.getByText(t.workOrderCompletion.servicePendingBanner)).toBeInTheDocument();
    });

    it("does not show 'Informar finalización' button when viewed by consumer", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const consumerViewProposal: ServiceProposalSummary = {
        ...proposal,
        status: "accepted",
        scheduledOn: pastDate,
        counterpart: {
          id: 7,
          role: "provider",
          name: "Juan",
          surname: "Pérez",
        },
      };

      render(<ServiceProposalDetailModal proposal={consumerViewProposal} onClose={vi.fn()} />);

      expect(
        screen.queryByRole("button", { name: t.workOrderCompletion.informCompletionButton })
      ).not.toBeInTheDocument();
    });

    it("opens ReportWorkCompletionModal when 'Informar finalización' is clicked", async () => {
      const user = userEvent.setup();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const acceptedProposal: ServiceProposalSummary = {
        ...proposal,
        status: "accepted",
        scheduledOn: pastDate,
        counterpart: {
          id: 10,
          role: "consumer",
          name: "María",
          surname: "Fernández",
        },
      };

      render(<ServiceProposalDetailModal proposal={acceptedProposal} onClose={vi.fn()} />);

      const button = screen.getByRole("button", {
        name: t.workOrderCompletion.informCompletionButton,
      });
      await user.click(button);

      expect(
        screen.getByRole("dialog", { name: t.workOrderCompletion.modalTitle })
      ).toBeInTheDocument();
    });
  });
});
