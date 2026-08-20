"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { t } from "@/infrastructure/i18n/translations";
import { DollarSign, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { formatAmountCents, formatScheduledOn } from "@/lib/proposal-utils";
import { getWorkOrderDetailAction } from "@/app/work-orders/actions";
import { CompletionEvidenceSection } from "./CompletionEvidenceSection";
import type { WorkOrderDetail } from "@/domain/work-order/types";

interface WorkOrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId?: number;
  initialAmountCents?: number;
  initialScheduledOn?: string;
  initialDescription?: string;
}

export function WorkOrderDetailModal({
  open,
  onClose,
  workOrderId,
  initialAmountCents = 1500000,
  initialScheduledOn = "2026-08-20T10:00:00Z",
  initialDescription = "Reparación de cañería en cocina",
}: WorkOrderDetailModalProps) {
  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);

  useEffect(() => {
    if (open && workOrderId) {
      getWorkOrderDetailAction(workOrderId)
        .then((res) => {
          if (res.ok) {
            setDetail(res.detail);
          }
        })
        .catch(() => {});
    }
  }, [open, workOrderId]);

  const currentStatus = detail?.status ?? "scheduled";
  const amountCents = detail?.amountCents ?? initialAmountCents;
  const scheduledOn = detail?.scheduledOn ?? initialScheduledOn;
  const description = detail?.description ?? initialDescription;

  const statusLabel =
    currentStatus === "paid"
      ? t.workOrderDetail.statusPaid
      : currentStatus === "awaiting_payment"
      ? t.workOrderDetail.statusAwaitingPayment
      : t.workOrderDetail.statusScheduled;

  const statusVariant =
    currentStatus === "paid"
      ? "success"
      : currentStatus === "awaiting_payment"
      ? "warning"
      : "default";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.workOrderDetail.modalTitle}
      closeLabel={t.workOrderDetail.closeButton}
      className="z-[60]"
    >
      <div className="p-6 space-y-5" data-testid="work-order-detail-modal">
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
            <div className="flex items-center gap-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-brand-primary shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                  {t.workOrderDetail.amountLabel}
                </span>
                <span className="text-subtitle font-bold text-slate-800 truncate">
                  {formatAmountCents(amountCents)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-brand-primary shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                  {t.workOrderDetail.scheduledOnLabel}
                </span>
                <span className="text-body-lg font-semibold text-slate-700 truncate">
                  {formatScheduledOn(scheduledOn)}
                </span>
              </div>
            </div>

            {detail?.paidOn && (
              <div
                data-testid="work-order-paid-info"
                className="flex items-center gap-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3.5 sm:col-span-2"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-emerald-200/70 shadow-2xs flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-caption font-semibold text-emerald-600 uppercase tracking-wider">
                    {t.workOrderDetail.paidOnLabel}
                  </span>
                  <span className="text-body-lg font-semibold text-emerald-950 truncate">
                    {formatScheduledOn(detail.paidOn)}
                  </span>
                </div>
              </div>
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
        </div>
      </div>
    </Modal>
  );
}
