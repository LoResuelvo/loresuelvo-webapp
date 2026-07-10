"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreateServiceProposalInput } from "@/domain/messaging/types";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

interface ServiceProposalModalProps {
  open: boolean;
  onClose: () => void;
  consumerId: number;
  onSubmit: (input: CreateServiceProposalInput) => Promise<void>;
}

export function ServiceProposalModal({
  open,
  onClose,
  consumerId,
  onSubmit,
}: ServiceProposalModalProps) {
  const [amount, setAmount] = useState("");
  const [scheduledOn, setScheduledOn] = useState("");
  const [description, setDescription] = useState("");

  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setAmount("");
      setScheduledOn("");
      setDescription("");
      setAmountError("");
      setDateError("");
      setSubmitError("");
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [open]);

  // Real-time validation
  useEffect(() => {
    if (amount) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) {
        setAmountError(t.messaging.serviceProposal.errorAmountInvalid);
      } else {
        setAmountError("");
      }
    } else {
      setAmountError("");
    }
  }, [amount]);

  useEffect(() => {
    if (scheduledOn) {
      const selectedDate = new Date(scheduledOn);
      const now = new Date();
      if (selectedDate <= now) {
        setDateError(t.messaging.serviceProposal.errorDatePast);
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [scheduledOn]);

  const hasValidationErrors = !!amountError || !!dateError;
  const isFormComplete = !!amount && !!scheduledOn && !!description;
  const isSubmitDisabled = hasValidationErrors || !isFormComplete || isSubmitting || isSuccess;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await onSubmit({
        consumerId,
        amount,
        scheduledOn: new Date(scheduledOn).toISOString(),
        description,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setSubmitError(t.messaging.serviceProposal.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.messaging.serviceProposal.modalTitle}
      closeLabel={t.messaging.serviceProposal.closeLabel}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">{t.messaging.serviceProposal.successTitle}</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {t.messaging.serviceProposal.successMessage}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">{t.messaging.serviceProposal.amountLabel}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder={t.messaging.serviceProposal.amountPlaceholder}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`pl-8 ${amountError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    disabled={isSubmitting}
                  />
                </div>
                {amountError && (
                  <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
                    {amountError}
                  </p>
                )}
              </div>

              {/* ScheduledOn */}
              <div className="space-y-2">
                <Label htmlFor="scheduledOn">{t.messaging.serviceProposal.scheduledOnLabel}</Label>
                <Input
                  id="scheduledOn"
                  type="datetime-local"
                  value={scheduledOn}
                  onChange={(e) => setScheduledOn(e.target.value)}
                  className={dateError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {dateError && (
                  <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
                    {dateError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t.messaging.serviceProposal.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  placeholder={t.messaging.serviceProposal.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{submitError}</p>
              </div>
            )}

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t.messaging.serviceProposal.cancelButton}
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={isSubmitDisabled}
                className="px-6 font-semibold"
              >
                {isSubmitting ? t.messaging.serviceProposal.submittingButton : t.messaging.serviceProposal.submitButton}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
