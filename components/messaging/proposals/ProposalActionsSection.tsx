import { ServiceProposalSummary } from "@/domain/messaging/types";
import { WorkOrder } from "@/domain/work-order/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { BookingDepositPayment } from "@/components/payments/BookingDepositPayment";

export interface ProposalActionsSectionProps {
  proposal: ServiceProposalSummary;
  workOrder: WorkOrder | null;
  isProvider: boolean;
  isAccepted: boolean;
  isScheduledDateReached: boolean;
  isReportedSuccess: boolean;
  onOpenCompletionModal: () => void;
  onOpenWorkOrderDetail: () => void;
}

export function ProposalActionsSection({
  proposal,
  workOrder,
  isProvider,
  isAccepted,
  isScheduledDateReached,
  isReportedSuccess,
  onOpenCompletionModal,
  onOpenWorkOrderDetail,
}: ProposalActionsSectionProps) {
  const counterpart = proposal.counterpart;
  const isAwaitingPayment =
    isReportedSuccess || workOrder?.status === "awaiting_payment" || workOrder?.status === "paid";

  return (
    <div className="space-y-2">
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
            onClick={onOpenWorkOrderDetail}
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
              onClick={onOpenCompletionModal}
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
  );
}
