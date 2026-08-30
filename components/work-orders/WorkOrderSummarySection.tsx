"use client";

import { DollarSign, Calendar, FileText, CheckCircle2, Star, Clock } from "lucide-react";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { Duration } from "@/domain/shared/Duration";
import { DetailField } from "@/components/ui/detail-field";
import { CompletionEvidenceSection } from "./CompletionEvidenceSection";
import { t } from "@/infrastructure/i18n/translations";
import type { WorkOrderDetail } from "@/domain/work-order/types";

export interface WorkOrderSummarySectionProps {
  amountCents: number;
  scheduledOn: string;
  description?: string;
  estimatedDurationMinutes?: number;
  paidOn?: string;
  completionReport?: WorkOrderDetail["completionReport"];
  review?: WorkOrderDetail["review"];
}

export function WorkOrderSummarySection({
  amountCents,
  scheduledOn,
  description,
  estimatedDurationMinutes,
  paidOn,
  completionReport,
  review,
}: WorkOrderSummarySectionProps) {
  return (
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

        {paidOn && (
          <DetailField
            icon={<CheckCircle2 className="w-5 h-5" />}
            label={t.workOrderDetail.paidOnLabel}
            value={ScheduledDateTime.formatWithTime(ScheduledDateTime.create(paidOn))}
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

      {completionReport && (
        <CompletionEvidenceSection report={completionReport} />
      )}

      {review && (
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
                    i < review.rating ? "star-filled" : "star-empty"
                  }
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              ))}
            </div>
          </div>
          {review.comment && (
            <p className="text-body text-slate-700 leading-relaxed font-normal italic">
              “{review.comment}”
            </p>
          )}
        </div>
      )}
    </div>
  );
}
