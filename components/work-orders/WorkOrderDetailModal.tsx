"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { ReportReviewModal } from "./ReportReviewModal";
import { useWorkOrderReviewReport } from "./useWorkOrderReviewReport";
import type { WorkOrderDetail } from "@/domain/work-order/types";
import type { WorkOrderCalendarConnectionState } from "@/components/work-orders/useWorkOrderCalendarConnection";
import WorkOrderCalendarConnection, { type WorkOrderCalendarAuthorization } from "./WorkOrderCalendarConnection";
import { Button } from "@/components/ui/button";
import { useResourceUpdate } from "@/infrastructure/notifications/NotificationContext";
import { ROUTES } from "@/lib/routes";
import { ClaimOperationLink } from "@/components/claims/ClaimOperationLink";

export interface WorkOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId?: number;
  initialAmountCents?: number;
  initialScheduledOn?: string;
  initialDescription?: string;
  initialEstimatedDurationMinutes?: number;
  isConsumer?: boolean;
  calendarConnection?: WorkOrderCalendarConnectionState;
  calendarAuthorization?: WorkOrderCalendarAuthorization;
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
  calendarConnection,
  calendarAuthorization,
}: WorkOrderDetailModalProps) {
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const detailRef = useRef(detail);
  const requestGenerationRef = useRef(0);
  const reportButtonRef = useRef<HTMLButtonElement | null>(null);
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  const detailContentRef = useRef<HTMLDivElement | null>(null);
  const currentWorkOrderIdRef = useRef(workOrderId);
  const isOpenRef = useRef(open);
  detailRef.current = detail;
  currentWorkOrderIdRef.current = workOrderId;
  isOpenRef.current = open;

  const isCurrentRequest = useCallback(
    (requestGeneration: number, requestedWorkOrderId: number) =>
      requestGeneration === requestGenerationRef.current &&
      isOpenRef.current &&
      currentWorkOrderIdRef.current === requestedWorkOrderId,
    []
  );

  const fetchDetail = useCallback(async (isBackground = false) => {
    if (!open || !workOrderId) return;
    const requestGeneration = ++requestGenerationRef.current;
    if (!isBackground) {
      setIsLoading(true);
      setHasError(false);
    }
    try {
      const res = await getWorkOrderDetailAction(workOrderId);
      if (!isCurrentRequest(requestGeneration, workOrderId)) return;
      if (res.ok) {
        setDetail(res.detail);
        setRefreshError(false);
        setHasError(false);
      } else {
        if (isBackground && detailRef.current?.id === workOrderId) {
          setRefreshError(true);
        } else {
          setHasError(true);
        }
      }
    } catch {
      if (!isCurrentRequest(requestGeneration, workOrderId)) return;
      if (isBackground && detailRef.current?.id === workOrderId) {
        setRefreshError(true);
      } else {
        setHasError(true);
      }
    } finally {
      if (isCurrentRequest(requestGeneration, workOrderId)) {
        setIsLoading(false);
      }
    }
  }, [isCurrentRequest, open, workOrderId]);

  useEffect(() => {
    setIsReportModalOpen(false);
    if (open && workOrderId) {
      setDetail(null);
      setRefreshError(false);
      setHasError(false);
      void fetchDetail(false);
    }
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [open, workOrderId, fetchDetail]);

  useResourceUpdate("work_order", workOrderId, () => {
    if (open) {
      fetchDetail(true);
    }
  });

  const currentStatus = detail?.status ?? "scheduled";
  const amountCents = detail?.amountCents ?? initialAmountCents;
  const scheduledOn = detail?.scheduledOn ?? initialScheduledOn;
  const description = detail?.description ?? initialDescription;
  const estimatedDurationMinutes = detail?.estimatedDurationMinutes ?? initialEstimatedDurationMinutes;

  const { label: statusLabel, variant: statusVariant } = WorkOrder.getStatusBadge(currentStatus);
  const canRate = WorkOrder.canReview({ status: currentStatus, review: detail?.review }, isConsumer);
  const resolvedWorkOrderId = workOrderId ?? detail?.id ?? 0;
  const {
    hasBeenReported: hasReportedReview,
    isPending: isReportSubmitting,
    submitReport,
  } = useWorkOrderReviewReport(resolvedWorkOrderId);
  const canReportReview = Boolean(
    !isConsumer &&
      detail?.review &&
      detail.id === resolvedWorkOrderId &&
      !hasReportedReview
  );
  const restoreReportFocus = useCallback((event: Event) => {
    event.preventDefault();
    const reportButton = reportButtonRef.current;
    const reviewSection = reviewSectionRef.current;
    const focusTarget = reportButton?.isConnected && !reportButton.disabled
      ? reportButton
      : reviewSection?.isConnected
        ? reviewSection
        : detailContentRef.current;
    focusTarget?.focus();
  }, []);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t.workOrderDetail.modalTitle}
        closeLabel={t.workOrderDetail.closeButton}
        className="z-[60]"
      >
        <div
          className="p-6 space-y-5"
          data-testid="work-order-detail-modal"
          ref={detailContentRef}
          tabIndex={-1}
        >
          <WorkOrderCalendarConnection
            connection={calendarConnection}
            profileHref={isConsumer ? ROUTES.consumer.profile : ROUTES.provider.profile}
            authorization={calendarAuthorization}
          />
          {refreshError && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="work-order-refresh-error"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-caption"
            >
              <span>{t.notifications.refreshError.message}</span>
              <Button
                size="sm"
                variant="brand"
                onClick={() => fetchDetail(true)}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                {t.notifications.refreshError.retry}
              </Button>
            </div>
          )}
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
              <Button
                size="sm"
                variant="brand"
                onClick={() => fetchDetail(false)}
                className="h-8 px-3 text-caption font-semibold"
              >
                {t.notifications.refreshError.retry}
              </Button>
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
                reviewSectionRef={reviewSectionRef}
              />

              <WorkOrderActionsSection
                workOrderId={resolvedWorkOrderId}
                status={currentStatus}
                amountCents={amountCents}
                canRate={canRate}
                onOpenReview={() => setIsReviewModalOpen(true)}
                canReportReview={canReportReview}
                isReportSubmitting={isReportSubmitting}
                onReportReview={() => setIsReportModalOpen(true)}
                reportButtonRef={reportButtonRef}
              />
              {detail && <ClaimOperationLink reference={{ kind: "work_order", id: detail.id }} isConsumer={isConsumer} />}
            </>
          )}
        </div>
      </Modal>

      {isReportModalOpen && (
        <ReportReviewModal
          open={true}
          onClose={() => setIsReportModalOpen(false)}
          onCloseAutoFocus={restoreReportFocus}
          onSubmitReport={submitReport}
        />
      )}

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
