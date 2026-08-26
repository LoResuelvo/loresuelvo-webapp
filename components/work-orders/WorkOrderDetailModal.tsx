"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { DollarSign, Calendar, FileText, CheckCircle2, Loader2, AlertCircle, Star, Clock } from "lucide-react";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { Duration } from "@/domain/shared/Duration";
import { WorkOrder } from "@/domain/work-order/WorkOrder";
import {
  getWorkOrderDetailAction,
  createServiceBalanceCheckoutAction,
  createWorkOrderReviewAction,
} from "@/app/work-orders/actions";
import { DetailField } from "@/components/ui/detail-field";
import { CompletionEvidenceSection } from "./CompletionEvidenceSection";
import { ServiceBalancePayment } from "@/components/payments/ServiceBalancePayment";
import { ReviewWorkOrderModal } from "./ReviewWorkOrderModal";
import type { WorkOrderDetail } from "@/domain/work-order/types";

interface WorkOrderDetailModalProps {
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

              {/* Contractual details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <DetailField
                    icon={<DollarSign className="w-5 h-5" />}
                    label={t.workOrderDetail.amountLabel}
                    value={Money.format(Money.create(amountCents))}
                    variant="highlight"
                  />

                  <DetailField
                    icon={<Calendar className="w-5 h-5" />}
                    label={t.workOrderDetail.scheduledOnLabel}
                    value={ScheduledDateTime.formatWithTime(ScheduledDateTime.create(scheduledOn))}
                    variant="default"
                  />

                  {estimatedDurationMinutes && (
                    <DetailField
                      icon={<Clock className="w-5 h-5" />}
                      label={t.workOrderDetail.durationLabel}
                      value={Duration.format(estimatedDurationMinutes)}
                      variant="default"
                      dataTestId="work-order-duration-info"
                    />
                  )}

                  {detail?.paidOn && (
                    <DetailField
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      label={t.workOrderDetail.paidOnLabel}
                      value={ScheduledDateTime.formatWithTime(ScheduledDateTime.create(detail.paidOn))}
                      className="bg-emerald-50/70 border-emerald-200/60 sm:col-span-2"
                      iconClassName="border-emerald-200/70 text-emerald-600"
                      labelClassName="text-emerald-600"
                      valueClassName="text-emerald-950"
                      dataTestId="work-order-paid-info"
                    />
                  )}
                </div>

                {description && (
                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                      <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                        {t.workOrderDetail.descriptionLabel}
                      </span>
                    </div>
                    <p className="text-body leading-relaxed text-slate-700 whitespace-pre-wrap font-normal">
                      {description}
                    </p>
                  </div>
                )}

                {detail?.completionReport && (
                  <CompletionEvidenceSection report={detail.completionReport} />
                )}

                {currentStatus === "awaiting_payment" && (
                  <ServiceBalancePayment
                    workOrderId={workOrderId ?? detail?.id ?? 0}
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
                      onClick={() => setIsReviewModalOpen(true)}
                    >
                      <Star className="w-4 h-4 fill-current" />
                      {t.workOrderDetail.rateServiceButton}
                    </Button>
                  </div>
                )}

                {detail?.review && (
                  <div
                    data-testid="work-order-review-section"
                    className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-semibold text-amber-900 uppercase tracking-wider">
                        {t.workOrderDetail.reviewSectionTitle}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            data-testid={
                              i < detail.review!.rating ? "star-filled" : "star-empty"
                            }
                            className={`w-4 h-4 ${
                              i < detail.review!.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {detail.review.comment && (
                      <p className="text-body text-slate-700 leading-relaxed font-normal italic">
                        “{detail.review.comment}”
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      {isReviewModalOpen && (
        <ReviewWorkOrderModal
          open={true}
          onClose={() => setIsReviewModalOpen(false)}
          workOrderId={workOrderId ?? detail?.id ?? 0}
          onSubmitReview={async (input) => {
            const res = await createWorkOrderReviewAction(workOrderId ?? detail?.id ?? 0, input);
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

