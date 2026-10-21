"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type {
  WorkOrderReviewReportCategory,
  WorkOrderReviewReportInput,
} from "@/domain/work-order/types";
import {
  validateWorkOrderReviewReportInput,
  type WorkOrderReviewReportValidationError,
} from "@/domain/work-order/review-report-validation";
import { t } from "@/infrastructure/i18n/translations";

const reportReasons = [
  { value: "abusive_language", label: t.workOrderReviewReport.reasons.abusiveLanguage },
  { value: "personal_data", label: t.workOrderReviewReport.reasons.personalData },
  { value: "spam_advertising", label: t.workOrderReviewReport.reasons.spamAdvertising },
  { value: "unrelated_content", label: t.workOrderReviewReport.reasons.unrelatedContent },
] as const;

function getSubmissionErrorMessage(status: number | null): string {
  if (status === 400) return t.workOrderReviewReport.submitErrors.invalidData;
  if (status === 401) return t.workOrderReviewReport.submitErrors.session;
  if (status === 403) return t.workOrderReviewReport.submitErrors.forbidden;
  if (status === 404) return t.workOrderReviewReport.submitErrors.unavailable;
  return t.workOrderReviewReport.submitErrors.generic;
}

type ReportFormState =
  | { kind: "editing" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "already_reported" }
  | { kind: "failed"; status: number | null };

interface ReportReviewModalProps {
  open: boolean;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  onSubmitReport: (
    input: WorkOrderReviewReportInput
  ) => Promise<{ ok: true } | { ok: false; status: number | null }>;
}

export function ReportReviewModal({
  open,
  onClose,
  onCloseAutoFocus,
  onSubmitReport,
}: ReportReviewModalProps) {
  const [category, setCategory] = useState<WorkOrderReviewReportCategory | "">("");
  const [explanation, setExplanation] = useState("");
  const [formState, setFormState] = useState<ReportFormState>({ kind: "editing" });
  const [validationError, setValidationError] =
    useState<WorkOrderReviewReportValidationError | null>(null);
  const isSubmitting = formState.kind === "submitting";
  const isSuccess = formState.kind === "success";
  const isAlreadyReported = formState.kind === "already_reported";

  const reasonError =
    validationError === "category_required" || validationError === "invalid_category";
  const explanationError = validationError !== null && !reasonError;

  function getValidationMessage(error: WorkOrderReviewReportValidationError): string {
    if (error === "category_required") return t.workOrderReviewReport.reasonRequired;
    if (error === "explanation_too_long") return t.workOrderReviewReport.explanationTooLong;
    if (error === "invalid_category") return t.workOrderReviewReport.invalidReason;
    return t.workOrderReviewReport.explanationInvalid;
  }

  const handleClose = () => {
    setCategory("");
    setExplanation("");
    setFormState({ kind: "editing" });
    setValidationError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const validation = validateWorkOrderReviewReportInput({
      category,
      explanation,
    });
    if (!validation.valid) {
      setFormState({ kind: "editing" });
      setValidationError(validation.error);
      return;
    }

    setValidationError(null);
    setFormState({ kind: "submitting" });
    try {
      const result = await onSubmitReport(validation.input);
      if (result.ok) setFormState({ kind: "success" });
      else if (result.status === 409) setFormState({ kind: "already_reported" });
      else setFormState({ kind: "failed", status: result.status });
    } catch {
      setFormState({ kind: "failed", status: null });
    } finally {
      setFormState((current) =>
        current.kind === "submitting" ? { kind: "editing" } : current
      );
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
            {isAlreadyReported && (
              <p role="alert" aria-live="assertive" className="text-sm text-amber-800">
                {t.workOrderReviewReport.alreadyReported}
              </p>
            )}
            {formState.kind === "failed" && (
              <p role="alert" aria-live="assertive" className="text-sm text-red-700">
                {getSubmissionErrorMessage(formState.status)}
              </p>
            )}
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
                  setValidationError(null);
                }}
                disabled={isSubmitting || isAlreadyReported}
                aria-invalid={reasonError}
                aria-describedby={reasonError ? "report-review-reason-error" : undefined}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:bg-slate-50"
              >
                <option value="">{t.workOrderReviewReport.reasonPlaceholder}</option>
                {reportReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {reasonError && (
                <p
                  id="report-review-reason-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {getValidationMessage(validationError!)}
                </p>
              )}
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
                onChange={(event) => {
                  setExplanation(event.target.value);
                  setValidationError(null);
                }}
                placeholder={t.workOrderReviewReport.explanationPlaceholder}
                disabled={isSubmitting || isAlreadyReported}
                rows={4}
                aria-invalid={explanationError}
                aria-describedby={
                  explanationError ? "report-review-explanation-error" : undefined
                }
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:bg-slate-50"
              />
              {explanationError && (
                <p
                  id="report-review-explanation-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {getValidationMessage(validationError!)}
                </p>
              )}
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting || isAlreadyReported}
              >
                {t.workOrderReviewReport.cancelButton}
              </Button>
              <Button
                type="submit"
                variant="brand"
                data-testid="submit-report-review-button"
                disabled={isSubmitting || isAlreadyReported}
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
