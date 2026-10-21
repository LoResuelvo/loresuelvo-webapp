"use client";

import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Flag, Star } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { ServiceBalancePayment } from "@/components/payments/ServiceBalancePayment";
import { createServiceBalanceCheckoutAction } from "@/app/work-orders/actions";
import { WorkOrderStatus } from "@/domain/work-order/types";

export interface WorkOrderActionsSectionProps {
  workOrderId: number;
  status: WorkOrderStatus;
  amountCents: number;
  canRate: boolean;
  onOpenReview: () => void;
  canReportReview: boolean;
  isReportSubmitting: boolean;
  onReportReview: () => void;
  reportButtonRef?: Ref<HTMLButtonElement>;
}

export function WorkOrderActionsSection({
  workOrderId,
  status,
  amountCents,
  canRate,
  onOpenReview,
  canReportReview,
  isReportSubmitting,
  onReportReview,
  reportButtonRef,
}: WorkOrderActionsSectionProps) {
  return (
    <>
      {status === "awaiting_payment" && (
        <ServiceBalancePayment
          workOrderId={workOrderId}
          totalServiceAmountCents={amountCents}
          createCheckout={createServiceBalanceCheckoutAction}
        />
      )}

      {canRate && (
        <div className="pt-2">
          <Button
            type="button"
            variant="brand"
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 shadow-xs cursor-pointer"
            data-testid="open-review-button"
            onClick={onOpenReview}
          >
            <Star className="w-4 h-4 fill-current" />
            {t.workOrderDetail.rateServiceButton}
          </Button>
        </div>
      )}

      {canReportReview && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold gap-2 cursor-pointer"
            data-testid="report-review-button"
            ref={reportButtonRef}
            onClick={onReportReview}
            disabled={isReportSubmitting}
            aria-busy={isReportSubmitting}
          >
            <Flag className="w-4 h-4" />
            {isReportSubmitting
              ? t.workOrderReviewReport.submittingButton
              : t.workOrderReviewReport.reportButton}
          </Button>
        </div>
      )}
    </>
  );
}
