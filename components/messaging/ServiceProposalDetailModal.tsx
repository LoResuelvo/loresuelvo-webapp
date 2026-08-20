"use client";

import { useState, useEffect } from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { WorkOrder } from "@/domain/work-order/types";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FileText, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { getInitials } from "@/lib/text-utils";
import { BookingDepositPayment } from "@/components/payments/BookingDepositPayment";
import ReportWorkCompletionModal from "@/components/provider/ReportWorkCompletionModal";
import { WorkOrderDetailModal } from "@/components/work-orders/WorkOrderDetailModal";
import { getWorkOrderByProposalAction } from "@/app/work-orders/actions";
import { useClock } from "@/hooks/useClock";

interface ServiceProposalDetailModalProps {
  proposal: ServiceProposalSummary;
  onClose: () => void;
  onViewConversation?: (conversationId: number) => void;
}

export default function ServiceProposalDetailModal({ 
  proposal, 
  onClose,
  onViewConversation,
}: ServiceProposalDetailModalProps) {
  const { counterpart } = proposal;
  const displayName = `${counterpart.name} ${counterpart.surname}`.trim() || "Usuario";
  const initials = getInitials(displayName);
  const statusBadge = getStatusBadge(proposal.status);
  const { now } = useClock();

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isWorkOrderDetailOpen, setIsWorkOrderDetailOpen] = useState(false);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [isReportedSuccess, setIsReportedSuccess] = useState(false);

  const isProvider = counterpart.role === "consumer";
  const isAccepted = proposal.status === "accepted";
  const scheduledTime = new Date(proposal.scheduledOn).getTime();
  const isScheduledDateReached = !isNaN(scheduledTime) && now().getTime() >= scheduledTime;

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

  const isAwaitingPayment = isReportedSuccess || workOrder?.status === "awaiting_payment" || workOrder?.status === "paid";

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title={t.serviceProposals.chatPanel.title}
        closeLabel={t.serviceProposals.chatPanel.closeLabel}
      >
        <div className="p-6 space-y-5" data-testid="service-proposal-detail-modal">
          {/* Counterpart info */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5 min-w-0">
              <Avatar
                src={counterpart.profilePhotoUrl}
                initials={initials}
                alt={`${t.messaging.photoAlt} ${displayName}`}
                size="lg"
                className="ring-2 ring-slate-100 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[17px] font-semibold text-slate-800 leading-tight">{displayName}</p>
                  <Badge variant={statusBadge.variant} className="px-2 py-0.5 font-medium">
                    {statusBadge.label}
                  </Badge>
                </div>
                {counterpart.categoryName && (
                  <p className="text-[13px] text-slate-500 mt-1 font-normal">{counterpart.categoryName}</p>
                )}
              </div>
            </div>

            {onViewConversation && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-brand-primary h-8 px-3 font-medium cursor-pointer shadow-2xs hover:bg-slate-50 hover:text-brand-primary shrink-0"
                onClick={() => onViewConversation(proposal.conversationId)}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {t.serviceProposals.viewConversation}
              </Button>
            )}
          </div>

          {/* Detail fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-center gap-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 transition-colors hover:bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-brand-primary shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.serviceProposals.chatPanel.amountLabel}
                  </span>
                  <span className="text-[17px] font-bold text-slate-800 truncate">
                    {formatAmountCents(proposal.amountCents)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 transition-colors hover:bg-slate-50">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-brand-primary shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.serviceProposals.chatPanel.dateLabel}
                  </span>
                  <span className="text-[15px] font-semibold text-slate-700 truncate">
                    {formatScheduledOn(proposal.scheduledOn)}
                  </span>
                </div>
              </div>
            </div>

            {proposal.description && (
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t.serviceProposals.chatPanel.descriptionLabel}
                  </span>
                </div>
                <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto pr-1 font-normal">
                  {proposal.description}
                </p>
              </div>
            )}

            {/* Consumer booking deposit payment */}
            {proposal.status === "pending" &&
              counterpart.role === "provider" &&
              proposal.bookingTerms && (
              <BookingDepositPayment
                serviceProposalId={proposal.id}
                pricing={{
                  currency: proposal.bookingTerms.currency,
                  depositCents: proposal.bookingTerms.depositCents,
                  platformFeeDueNowCents: proposal.bookingTerms.platformFeeDueNowCents,
                  amountDueNowCents: proposal.bookingTerms.amountDueNowCents,
                }}
                bookingTerms={proposal.bookingTerms}
              />
            )}

            {/* View work order detail action */}
            {isAccepted && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl text-sm font-semibold gap-2 cursor-pointer border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5 shadow-2xs"
                  onClick={() => setIsWorkOrderDetailOpen(true)}
                >
                  <FileText className="w-4 h-4 text-brand-primary" />
                  {t.workOrderDetail.viewDetailButton}
                </Button>
              </div>
            )}

            {/* Provider work order completion actions */}
            {isAccepted && isProvider && (
              <div className="pt-2">
                {isAwaitingPayment ? (
                  <div
                    role="status"
                    data-testid="completion-reported-success-banner"
                    className="flex items-center gap-3 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-emerald-800 text-sm animate-in fade-in zoom-in-95 duration-300 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-in zoom-in duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-900 leading-tight">
                        {t.workOrderCompletion.successMessage}
                      </p>
                    </div>
                  </div>
                ) : isScheduledDateReached ? (
                  <Button
                    variant="brand"
                    className="w-full h-11 rounded-xl text-sm font-semibold gap-2 shadow-xs cursor-pointer"
                    onClick={() => setIsCompletionModalOpen(true)}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t.workOrderCompletion.informCompletionButton}
                  </Button>
                ) : (
                  <div
                    role="note"
                    className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-amber-800 text-sm"
                  >
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span className="leading-relaxed font-medium">
                      {t.workOrderCompletion.servicePendingBanner}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
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
        />
      )}
    </>
  );
}
