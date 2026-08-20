"use client";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { t } from "@/infrastructure/i18n/translations";
import { DollarSign, Calendar, FileText } from "lucide-react";
import { formatAmountCents, formatScheduledOn } from "@/lib/proposal-utils";

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.workOrderDetail.modalTitle}
      closeLabel={t.workOrderDetail.closeButton}
    >
      <div className="p-6 space-y-5" data-testid="work-order-detail-modal">
        {/* Header with status */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {t.workOrderDetail.modalTitle}
            </h3>
            {workOrderId && (
              <p className="text-xs text-slate-400 mt-0.5">#{workOrderId}</p>
            )}
          </div>
          <Badge variant="default" className="px-2.5 py-0.5 font-medium">
            {t.workOrderDetail.statusScheduled}
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
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t.workOrderDetail.amountLabel}
                </span>
                <span className="text-[17px] font-bold text-slate-800 truncate">
                  {formatAmountCents(initialAmountCents)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-brand-primary shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t.workOrderDetail.scheduledOnLabel}
                </span>
                <span className="text-[15px] font-semibold text-slate-700 truncate">
                  {formatScheduledOn(initialScheduledOn)}
                </span>
              </div>
            </div>
          </div>

          {initialDescription && (
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t.workOrderDetail.descriptionLabel}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap font-normal">
                {initialDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
