"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreateServiceProposalInput } from "@/domain/messaging/types";
import { CheckCircle2, AlertTriangle, Clock, CalendarIcon } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});

export type ServiceProposalDraft = {
  amount: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string;
};

interface ServiceProposalModalProps {
  open: boolean;
  onClose: () => void;
  consumerId: number;
  draft?: ServiceProposalDraft;
  onDraftChange?: (draft: ServiceProposalDraft) => void;
  onSubmit: (input: CreateServiceProposalInput) => Promise<void>;
}

export function ServiceProposalModal({
  open,
  onClose,
  consumerId,
  draft,
  onDraftChange,
  onSubmit,
}: ServiceProposalModalProps) {
  const [amount, setAmount] = useState(draft?.amount ?? "");
  const [scheduledDate, setScheduledDate] = useState(draft?.scheduledDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(draft?.scheduledTime ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");

  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load draft when consumer changes or modal opens
  useEffect(() => {
    if (open) {
      setAmount(draft?.amount ?? "");
      setScheduledDate(draft?.scheduledDate ?? "");
      setScheduledTime(draft?.scheduledTime ?? "");
      setDescription(draft?.description ?? "");
      setAmountError("");
      setDateError("");
      setSubmitError("");
      setIsSubmitting(false);
      setIsSuccess(false);
      setIsConfirming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consumerId]); 

  // Sync draft to parent
  useEffect(() => {
    if (open) {
      onDraftChange?.({ amount, scheduledDate, scheduledTime, description });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, scheduledDate, scheduledTime, description, open]);

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
    if (scheduledDate && scheduledTime) {
      const selectedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      if (selectedDate <= now) {
        setDateError(t.messaging.serviceProposal.errorDatePast);
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [scheduledDate, scheduledTime]);

  const hasValidationErrors = !!amountError || !!dateError;
  const isFormComplete = !!amount && !!scheduledDate && !!scheduledTime && !!description;
  const isSubmitDisabled = hasValidationErrors || !isFormComplete || isSubmitting || isSuccess;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;
    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setIsConfirming(false);
    setSubmitError("");

    try {
      await onSubmit({
        consumerId,
        amount,
        scheduledOn: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
        description,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      if (e instanceof Error && e.message.includes("payment account")) {
        setSubmitError(t.messaging.serviceProposal.errorNoPaymentAccount);
      } else {
        setSubmitError(t.messaging.serviceProposal.errorGeneric);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.messaging.serviceProposal.modalTitle}
      closeLabel={t.messaging.serviceProposal.closeLabel}
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-6">
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

              {/* Scheduled Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">{t.messaging.serviceProposal.dateLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-transparent border-input",
                          !scheduledDate && "text-muted-foreground",
                          dateError && "border-red-500 focus-visible:ring-red-500"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(parseISO(scheduledDate), "dd/MM/yyyy") : <span>{t.messaging.serviceProposal.datePlaceholder || "Seleccionar"}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate ? parseISO(scheduledDate) : undefined}
                        onSelect={(d) => {
                          if (d) setScheduledDate(format(d, "yyyy-MM-dd"));
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">{t.messaging.serviceProposal.timeLabel}</Label>
                  <Select
                    value={scheduledTime}
                    onValueChange={setScheduledTime}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="scheduledTime" className={dateError ? "border-red-500 focus:ring-red-500" : ""}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <SelectValue placeholder="Seleccionar" />
                      </div>
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[160px]">
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {dateError && (
                <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
                  {dateError}
                </p>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t.messaging.serviceProposal.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  placeholder={t.messaging.serviceProposal.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[160px] resize-none"
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

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.messaging.serviceProposal.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.messaging.serviceProposal.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {t.messaging.serviceProposal.cancelButton}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmSubmit();
              }} 
              disabled={isSubmitting}
            >
              {isSubmitting ? t.messaging.serviceProposal.submittingButton : t.messaging.serviceProposal.confirmSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
}
