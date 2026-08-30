"use client";

import { useState, useEffect } from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { WorkOrder } from "@/domain/work-order/types";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { Modal } from "@/components/ui/modal";
import { t } from "@/infrastructure/i18n/translations";
import ReportWorkCompletionModal from "@/components/work-orders/ReportWorkCompletionModal";
import { WorkOrderDetailModal } from "@/components/work-orders/WorkOrderDetailModal";
import { getWorkOrderByProposalAction } from "@/app/work-orders/actions";
import { useClock } from "@/hooks/useClock";
import { ProposalStatusSection } from "./ProposalStatusSection";
import { ProposalActionsSection } from "./ProposalActionsSection";

export interface ServiceProposalDetailModalProps {
  proposal: ServiceProposalSummary;
  onClose: () => void;
  onViewConversation?: (conversationId: number) => void;
}

export default function ServiceProposalDetailModal({ 
  proposal, 
  onClose,
  onViewConversation,
}: ServiceProposalDetailModalProps) {
  const { now } = useClock();

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isWorkOrderDetailOpen, setIsWorkOrderDetailOpen] = useState(false);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isReportedSuccess, setIsReportedSuccess] = useState(false);

  const isProvider = proposal.counterpart.role === "consumer";
  const isAccepted = proposal.status === "accepted";
  const scheduledOnVo = ScheduledDateTime.create(proposal.scheduledOn);
  const isScheduledDateReached = !ScheduledDateTime.isFuture(scheduledOnVo, now());

  useEffect(() => {
    if (isAccepted) {
      getWorkOrderByProposalAction(proposal.id)
        .then((res) => {
          if (res.ok && res.workOrder) {
            setWorkOrder(res.workOrder);
          }
        })
        .catch(() => {});
    }
  }, [proposal.id, isAccepted]);

  return (
    <>
      <Modal
        open={!isWorkOrderDetailOpen && !isCompletionModalOpen}
        onClose={onClose}
        title={t.serviceProposals.chatPanel.title}
        closeLabel={t.serviceProposals.chatPanel.closeLabel}
      >
        <div className="p-6 space-y-5" data-testid="service-proposal-detail-modal">
          <ProposalStatusSection
            proposal={proposal}
            onViewConversation={onViewConversation}
          />

          <ProposalActionsSection
            proposal={proposal}
            workOrder={workOrder}
            isProvider={isProvider}
            isAccepted={isAccepted}
            isScheduledDateReached={isScheduledDateReached}
            isReportedSuccess={isReportedSuccess}
            onOpenCompletionModal={() => setIsCompletionModalOpen(true)}
            onOpenWorkOrderDetail={() => setIsWorkOrderDetailOpen(true)}
          />
        </div>
      </Modal>

      {isCompletionModalOpen && (
        <ReportWorkCompletionModal
          open={true}
          onClose={() => setIsCompletionModalOpen(false)}
          workOrderId={workOrder?.id ?? proposal.id}
          onSuccess={() => {
            setIsReportedSuccess(true);
          }}
        />
      )}

      {isWorkOrderDetailOpen && (
        <WorkOrderDetailModal
          open={true}
          onClose={() => setIsWorkOrderDetailOpen(false)}
          workOrderId={workOrder?.id ?? proposal.id}
          initialAmountCents={proposal.amountCents}
          initialScheduledOn={proposal.scheduledOn}
          initialDescription={proposal.description}
          isConsumer={!isProvider}
        />
      )}
    </>
  );
}
