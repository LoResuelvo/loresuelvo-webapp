"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StarRatingInput } from "./StarRatingInput";
import { t } from "@/infrastructure/i18n/translations";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ReviewWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId: number;
  onSubmitReview: (input: { rating: number; comment?: string }) => Promise<{ ok: boolean; message?: string | null; status?: number | null }>;
  onSuccess?: () => void;
}


export function ReviewWorkOrderModal({
  open,
  onClose,
  workOrderId,
  onSubmitReview,
  onSuccess,
}: ReviewWorkOrderModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const maxChars = 500;
  const isFormValid = rating >= 1 && rating <= 5 && comment.length <= maxChars;

  const handleClose = () => {
    setRating(0);
    setComment("");
    setErrorMessage(null);
    if (isSuccess) onSuccess?.();
    setIsSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await onSubmitReview({
        rating,
        comment: comment.trim() || undefined,
      });

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage(t.workOrderReview.errors.alreadyReviewed);
        } else if (res.status === 400) {
          setErrorMessage(t.workOrderReview.errors.requiredRating);
        } else {
          setErrorMessage(t.workOrderReview.errors.serverError);
        }
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch {
      setErrorMessage(t.workOrderReview.errors.serverError);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={t.workOrderReview.modalTitle} closeLabel={t.workOrderReview.closeButton}>
      <div className="p-6 space-y-5" data-testid="review-work-order-modal">
        {isSuccess ? (
          <div className="text-center py-6 space-y-4" data-testid="review-success-message">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-slate-800">{t.workOrderReview.successMessage}</p>
            <Button variant="brand" onClick={handleClose} className="w-full">
              {t.workOrderReview.closeButton}
            </Button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div role="alert" className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="star-rating" className="text-sm font-semibold text-slate-700 block">
                {t.workOrderReview.ratingLabel} <span className="text-red-500">*</span>
              </label>
              <StarRatingInput value={rating} onChange={(r) => { setRating(r); setErrorMessage(null); }} disabled={isSubmitting} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="review-comment" className="text-sm font-semibold text-slate-700">
                  {t.workOrderReview.commentLabel}
                </label>
                <span className="text-xs text-slate-400 font-medium">{comment.length}/{maxChars}</span>
              </div>
              <textarea
                id="review-comment"
                data-testid="review-comment-input"
                value={comment}
                maxLength={maxChars}
                onChange={(e) => setComment(e.target.value.slice(0, maxChars))}
                placeholder={t.workOrderReview.commentPlaceholder}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-sm resize-none disabled:bg-slate-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                {t.workOrderReview.cancelButton}
              </Button>
              <Button
                type="button"
                variant="brand"
                data-testid="submit-review-button"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.workOrderReview.submittingButton}
                  </span>
                ) : (
                  t.workOrderReview.submitButton
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
