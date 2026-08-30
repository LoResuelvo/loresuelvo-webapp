"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { t } from "@/infrastructure/i18n/translations";
import { Loader2, AlertCircle } from "lucide-react";
import { WorkOrder } from "@/domain/work-order/WorkOrder";
import {
  getWorkOrderDetailAction,
  createWorkOrderReviewAction,
} from "@/app/work-orders/actions";
import { WorkOrderSummarySection } from "./WorkOrderSummarySection";
import { WorkOrderActionsSection } from "./WorkOrderActionsSection";
import { ReviewWorkOrderModal } from "./ReviewWorkOrderModal";
import type { WorkOrderDetail } from "@/domain/work-order/types";

export interface WorkOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId?: number;
  initialAmountCents?: number;
  initialScheduledOn?: string;
  initialDescription?: string;
  initialEstimatedDurationMinutes?: number;
  isConsumer?: boolean;
}

export function WorkOrderDetailModal({
  open,
  onClose,
  workOrderId,
  initialAmountCents = 1500000,
  initialScheduledOn = "2026-08-20T10:00:00Z",
  initialDescription = "Reparación de cañería en cocina",
  initialEstimatedDurationMinutes,
  isConsumer = true,
}: WorkOrderDetailModalProps) {
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (open && workOrderId) {
      setIsLoading(true);
      setHasError(false);
      getWorkOrderDetailAction(workOrderId)
        .then((res) => {
          if (res.ok) {
            setDetail(res.detail);
          } else {
            setHasError(true);
          }
        })
        .catch(() => {
          setHasError(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, workOrderId]);

  const currentStatus = detail?.status ?? "scheduled";
  const amountCents = detail?.amountCents ?? initialAmountCents;
  const scheduledOn = detail?.scheduledOn ?? initialScheduledOn;
  const description = detail?.description ?? initialDescription;
  const estimatedDurationMinutes = detail?.estimatedDurationMinutes ?? initialEstimatedDurationMinutes;

  const { label: statusLabel, variant: statusVariant } = WorkOrder.getStatusBadge(currentStatus);
  const canRate = WorkOrder.canReview({ status: currentStatus, review: detail?.review }, isConsumer);
  const resolvedWorkOrderId = workOrderId ?? detail?.id ?? 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t.workOrderDetail.modalTitle}
        closeLabel={t.workOrderDetail.closeButton}
        className="z-[60]"
      >
        <div className="p-6 space-y-5" data-testid="work-order-detail-modal">
          {hasError ? (
            <div
              data-testid="work-order-detail-error"
              className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-body font-semibold text-slate-800">
                {t.workOrderDetail.errorMessage}
              </p>
            </div>
          ) : isLoading && !detail ? (
            <div
              data-testid="work-order-detail-loading"
              className="flex flex-col items-center justify-center py-12 space-y-3"
            >
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
              <p className="text-small text-slate-500 font-medium">
                {t.workOrderDetail.loadingText}
              </p>
            </div>
          ) : (
            <>
              {/* Status Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                    {t.workOrderDetail.orderLabel}
                  </span>
                  {workOrderId && (
                    <p className="text-body font-semibold text-slate-700 mt-0.5">#{workOrderId}</p>
                  )}
                </div>
                <Badge variant={statusVariant} className="px-2.5 py-0.5 font-medium">
                  {statusLabel}
                </Badge>
              </div>

              <WorkOrderSummarySection
                amountCents={amountCents}
                scheduledOn={scheduledOn}
                description={description}
                estimatedDurationMinutes={estimatedDurationMinutes}
                paidOn={detail?.paidOn}
                completionReport={detail?.completionReport}
                review={detail?.review}
              />

              <WorkOrderActionsSection
                workOrderId={resolvedWorkOrderId}
                status={currentStatus}
                amountCents={amountCents}
                canRate={canRate}
                onOpenReview={() => setIsReviewModalOpen(true)}
              />
            </>
          )}
        </div>
      </Modal>

      {isReviewModalOpen && (
        <ReviewWorkOrderModal
          open={true}
          onClose={() => setIsReviewModalOpen(false)}
          workOrderId={resolvedWorkOrderId}
          onSubmitReview={async (input) => {
            const res = await createWorkOrderReviewAction(resolvedWorkOrderId, input);
            if (res.ok) {
              setDetail((prev) =>
                prev
                  ? {
                      ...prev,
                      review: res.review,
                    }
                  : null
              );
            }
            return res;
          }}
        />
      )}
    </>
  );
}

export default WorkOrderDetailModal;
