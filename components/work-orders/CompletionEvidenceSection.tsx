"use client";

import { t } from "@/infrastructure/i18n/translations";
import { formatScheduledOn } from "@/lib/proposal-utils";
import { ImageGalleryPreview } from "@/components/shared/ImageGalleryPreview";
import type { CompletionReportDetail } from "@/domain/work-order/types";
import { CheckCircle2, Clock, FileText } from "lucide-react";

interface CompletionEvidenceSectionProps {
  report: CompletionReportDetail;
}

export function CompletionEvidenceSection({ report }: CompletionEvidenceSectionProps) {
  const galleryImages = (report.images || []).map((img) => ({
    id: img.fileId,
    url: img.url,
    originalName: img.originalName,
  }));

  return (
    <div
      data-testid="completion-evidence-section"
      className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 space-y-4 shadow-2xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <h4 className="text-body font-bold text-slate-800">
            {t.workOrderDetail.evidenceSectionTitle}
          </h4>
        </div>
        {report.reportedOn && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-small font-medium">
              {formatScheduledOn(report.reportedOn)}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {report.description && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
              {t.workOrderDetail.deliveryDescriptionLabel}
            </span>
          </div>
          <p className="text-body text-slate-700 leading-relaxed font-normal whitespace-pre-wrap pl-5">
            {report.description}
          </p>
        </div>
      )}

      {/* Images Gallery */}
      {galleryImages.length > 0 && (
        <div className="pt-2 border-t border-slate-200/50">
          <ImageGalleryPreview
            images={galleryImages}
            label={t.workOrderCompletion.evidenceImagesLabel}
          />
        </div>
      )}
    </div>
  );
}
