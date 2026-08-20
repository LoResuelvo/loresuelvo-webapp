import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ServiceProposalDetailModal from "./ServiceProposalDetailModal";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";
import * as workOrderActions from "@/app/work-orders/actions";

vi.mock("@/app/work-orders/actions", () => ({
  getWorkOrderByProposalAction: vi.fn().mockResolvedValue({ ok: true, workOrder: null }),
  reportWorkCompletionAction: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("ServiceProposalDetailModal", () => {
  const proposal: ServiceProposalSummary = {
    id: 1,
    conversationId: 100,
    amountCents: 1500000,
    scheduledOn: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería de agua en cocina",
    status: "pending",
    createdOn: "2026-08-01T10:00:00Z",
    counterpart: {
      id: 2,
      role: "provider",
      name: "Juan",
      surname: "Pérez",
      categoryName: "Plomería",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workOrderActions.getWorkOrderByProposalAction).mockResolvedValue({
      ok: true,
      workOrder: null,
    });
  });

  it("renders modal with proposal details", () => {
    render(<ServiceProposalDetailModal proposal={proposal} onClose={vi.fn()} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Plomería")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Reparación de cañería de agua en cocina")).toBeInTheDocument();
  });

  it("calls onViewConversation when clicking 'Ver conversación'", async () => {
    const user = userEvent.setup();
    const onViewConversation = vi.fn();

    render(
      <ServiceProposalDetailModal
        proposal={proposal}
        onClose={vi.fn()}
        onViewConversation={onViewConversation}
      />
    );

    const button = screen.getByRole("button", { name: /ver conversación/i });
    await user.click(button);

    expect(onViewConversation).toHaveBeenCalledWith(100);
  });

  it("calls onClose when clicking close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ServiceProposalDetailModal proposal={proposal} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  describe("US-26 Work Order Completion Actions", () => {
    it("shows 'Informar finalización' button when viewed by provider, status is accepted and scheduled date reached", () => {
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

    it("shows pending service banner when viewed by provider, status is accepted but scheduled date is in the future", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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

    it("shows inline success banner when work order is in awaiting_payment status", async () => {
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

      vi.mocked(workOrderActions.getWorkOrderByProposalAction).mockResolvedValue({
        ok: true,
        workOrder: {
          id: 5,
          serviceProposalId: 1,
          status: "awaiting_payment",
          amountCents: 1500000,
          scheduledOn: pastDate,
          description: "Reparación",
          acceptedOn: pastDate,
        },
      });

      render(<ServiceProposalDetailModal proposal={acceptedProposal} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("completion-reported-success-banner")).toBeInTheDocument();
        expect(screen.getByText(t.workOrderCompletion.successMessage)).toBeInTheDocument();
      });
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

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: t.workOrderCompletion.modalTitle })
        ).toBeInTheDocument();
      });
    });
  });
});
