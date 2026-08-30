"use client";

import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
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
}

export function WorkOrderActionsSection({
  workOrderId,
  status,
  amountCents,
  canRate,
  onOpenReview,
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
    </>
  );
}
