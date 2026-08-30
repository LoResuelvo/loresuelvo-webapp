import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { ProposalStatusSection } from "./ProposalStatusSection";
import { ProposalActionsSection } from "./ProposalActionsSection";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";

describe("ServiceProposalDetail Sections", () => {
  const proposal: ServiceProposalSummary = {
    id: 1,
    conversationId: 100,
    amountCents: 1500000,
    scheduledOn: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería",
    estimatedDurationMinutes: 90,
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

  describe("ProposalStatusSection", () => {
    it("renders counterpart information and details", () => {
      const onViewConversation = vi.fn();
      render(
        <ProposalStatusSection
          proposal={proposal}
          onViewConversation={onViewConversation}
        />
      );

      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("Plomería")).toBeInTheDocument();
      expect(screen.getByText("Reparación de cañería")).toBeInTheDocument();
      expect(screen.getByText("1 h 30 min")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /ver conversación/i }));
      expect(onViewConversation).toHaveBeenCalledWith(100);
    });
  });

  describe("ProposalActionsSection", () => {
    it("triggers open work order detail and completion callbacks", () => {
      const onOpenCompletion = vi.fn();
      const onOpenWorkOrder = vi.fn();

      render(
        <ProposalActionsSection
          proposal={proposal}
          workOrder={null}
          isProvider={true}
          isAccepted={true}
          isScheduledDateReached={true}
          isReportedSuccess={false}
          onOpenCompletionModal={onOpenCompletion}
          onOpenWorkOrderDetail={onOpenWorkOrder}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: t.workOrderDetail.viewDetailButton }));
      expect(onOpenWorkOrder).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: t.workOrderCompletion.informCompletionButton }));
      expect(onOpenCompletion).toHaveBeenCalledTimes(1);
    });
  });
});
