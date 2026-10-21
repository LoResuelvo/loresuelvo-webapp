"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type {
  WorkOrderReviewReportCategory,
  WorkOrderReviewReportInput,
} from "@/domain/work-order/types";
import { t } from "@/infrastructure/i18n/translations";

const reportReasons = [
  { value: "abusive_language", label: t.workOrderReviewReport.reasons.abusiveLanguage },
  { value: "personal_data", label: t.workOrderReviewReport.reasons.personalData },
  { value: "spam_advertising", label: t.workOrderReviewReport.reasons.spamAdvertising },
  { value: "unrelated_content", label: t.workOrderReviewReport.reasons.unrelatedContent },
] as const;

interface ReportReviewModalProps {
  open: boolean;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onSubmitReport: (input: WorkOrderReviewReportInput) => Promise<{ ok: boolean }>;
}

export function ReportReviewModal({
  open,
  onClose,
  onCloseAutoFocus,
  onSubmitReport,
}: ReportReviewModalProps) {
  const [category, setCategory] = useState<WorkOrderReviewReportCategory | "">("");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClose = () => {
    setCategory("");
    setExplanation("");
    setIsSubmitting(false);
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!category || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const hasExplanation = explanation.length > 0;
      const result = await onSubmitReport({
        category,
        ...(hasExplanation ? { explanation } : {}),
      });
      if (result.ok) setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={t.workOrderReviewReport.modalTitle}
      closeLabel={t.workOrderReviewReport.closeButton}
      className="z-[70]"
      overlayClassName="z-[65]"
    >
      <div className="p-6 space-y-5" data-testid="report-review-modal">
        {isSuccess ? (
          <div
            role="status"
            aria-live="polite"
            className="text-center py-6 space-y-4"
            data-testid="report-review-success-message"
          >
            <p className="text-lg font-bold text-slate-800">
              {t.workOrderReviewReport.successMessage}
            </p>
            <Button variant="brand" onClick={handleClose} className="w-full">
              {t.workOrderReviewReport.closeButton}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="report-review-reason"
                className="block text-sm font-semibold text-slate-700"
              >
                {t.workOrderReviewReport.reasonLabel}
              </label>
              <select
                id="report-review-reason"
                value={category}
                onChange={(event) => {
                  const selectedReason = reportReasons.find(
                    (reason) => reason.value === event.target.value
                  );
                  setCategory(selectedReason?.value ?? "");
                }}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:bg-slate-50"
              >
                <option value="">{t.workOrderReviewReport.reasonPlaceholder}</option>
                {reportReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="report-review-explanation"
                className="block text-sm font-semibold text-slate-700"
              >
                {t.workOrderReviewReport.explanationLabel}
              </label>
              <textarea
                id="report-review-explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                placeholder={t.workOrderReviewReport.explanationPlaceholder}
                disabled={isSubmitting}
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:bg-slate-50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="brand"
                data-testid="submit-report-review-button"
                disabled={!category || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting
                  ? t.workOrderReviewReport.submittingButton
                  : t.workOrderReviewReport.submitButton}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
