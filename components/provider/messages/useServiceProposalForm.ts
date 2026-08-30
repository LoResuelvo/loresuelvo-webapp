import { useState, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { type CreateServiceProposalInput } from "@/domain/messaging/types";
import { useClock } from "@/hooks/useClock";
import { t } from "@/infrastructure/i18n/translations";

export type ServiceProposalDraft = {
  amount: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDurationMinutes?: string;
  description: string;
};

export const DURATION_PRESETS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1 h 30 min" },
  { value: "120", label: "2 horas" },
  { value: "150", label: "2 h 30 min" },
  { value: "180", label: "3 horas" },
  { value: "240", label: "4 horas" },
  { value: "300", label: "5 horas" },
  { value: "360", label: "6 horas" },
  { value: "480", label: "8 horas (Jornada completa)" },
  { value: "custom", label: "Personalizada..." },
] as const;

export const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

export interface UseServiceProposalFormOptions {
  open: boolean;
  onClose: () => void;
  consumerId: number;
  draft?: ServiceProposalDraft;
  onDraftChange?: (draft: ServiceProposalDraft) => void;
  onSubmit: (input: CreateServiceProposalInput) => Promise<void>;
}

export function useServiceProposalForm({
  open,
  onClose,
  consumerId,
  draft,
  onDraftChange,
  onSubmit,
}: UseServiceProposalFormOptions) {
  const initialDuration = draft?.estimatedDurationMinutes ?? "";
  const initialPreset = DURATION_PRESETS.some((p) => p.value === initialDuration)
    ? initialDuration
    : initialDuration
    ? "custom"
    : "";

  const [amount, setAmount] = useState(draft?.amount ?? "");
  const [scheduledDate, setScheduledDate] = useState(draft?.scheduledDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(draft?.scheduledTime ?? "");
  const [selectedDurationPreset, setSelectedDurationPreset] = useState(initialPreset);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(initialDuration);
  const [description, setDescription] = useState(draft?.description ?? "");

  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [durationError, setDurationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Load draft when consumer changes or modal opens
  useEffect(() => {
    if (open) {
      const dVal = draft?.estimatedDurationMinutes ?? "";
      const dPreset = DURATION_PRESETS.some((p) => p.value === dVal)
        ? dVal
        : dVal
        ? "custom"
        : "";
      setAmount(draft?.amount ?? "");
      setScheduledDate(draft?.scheduledDate ?? "");
      setScheduledTime(draft?.scheduledTime ?? "");
      setSelectedDurationPreset(dPreset);
      setEstimatedDurationMinutes(dVal);
      setDescription(draft?.description ?? "");
      setAmountError("");
      setDateError("");
      setDurationError("");
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
      onDraftChange?.({ amount, scheduledDate, scheduledTime, estimatedDurationMinutes, description });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, scheduledDate, scheduledTime, estimatedDurationMinutes, description, open]);

  // Real-time validation: Amount
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

  const { now } = useClock();

  // Real-time validation: Date & Time
  useEffect(() => {
    if (scheduledDate && scheduledTime) {
      const selectedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      const currentDate = now();
      if (selectedDate <= currentDate) {
        setDateError(t.messaging.serviceProposal.errorDatePast);
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [scheduledDate, scheduledTime, now]);

  // Real-time validation: Duration
  useEffect(() => {
    if (estimatedDurationMinutes) {
      const parsed = Number(estimatedDurationMinutes);
      if (isNaN(parsed) || !Number.isInteger(parsed)) {
        setDurationError(t.messaging.serviceProposal.errorDurationInvalid);
      } else if (parsed < 15) {
        setDurationError(t.messaging.serviceProposal.errorDurationMin);
      } else if (parsed > 1440) {
        setDurationError(t.messaging.serviceProposal.errorDurationMax);
      } else {
        setDurationError("");
      }
    } else {
      setDurationError("");
    }
  }, [estimatedDurationMinutes]);

  const hasValidationErrors = !!amountError || !!dateError || !!durationError;
  const isFormComplete = !!amount && !!scheduledDate && !!scheduledTime && !!estimatedDurationMinutes && !!description;
  const isSubmitDisabled = hasValidationErrors || !isFormComplete || isSubmitting || isSuccess;

  const handleChangeDurationPreset = (val: string) => {
    setSelectedDurationPreset(val);
    if (val !== "custom") {
      setEstimatedDurationMinutes(val);
    } else {
      if (DURATION_PRESETS.some((p) => p.value === estimatedDurationMinutes)) {
        setEstimatedDurationMinutes("");
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
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
        estimatedDurationMinutes: parseInt(estimatedDurationMinutes, 10),
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  return {
    amount,
    setAmount,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    selectedDurationPreset,
    estimatedDurationMinutes,
    setEstimatedDurationMinutes,
    handleChangeDurationPreset,
    description,
    setDescription,
    amountError,
    dateError,
    durationError,
    submitError,
    isSubmitting,
    isSuccess,
    isConfirming,
    setIsConfirming,
    hasValidationErrors,
    isFormComplete,
    isSubmitDisabled,
    handleSubmit,
    handleConfirmSubmit,
    handleKeyDown,
  };
}
