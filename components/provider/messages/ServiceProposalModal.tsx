"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { CreateServiceProposalInput } from "@/domain/messaging/types";
import {
  useServiceProposalForm,
  type ServiceProposalDraft,
  DURATION_PRESETS,
  TIME_SLOTS,
} from "./useServiceProposalForm";
import { ProposalPricingSection } from "./ProposalPricingSection";
import { ProposalScheduleSection } from "./ProposalScheduleSection";
import { ProposalDescriptionSection } from "./ProposalDescriptionSection";
import { ProposalConfirmDialog } from "./ProposalConfirmDialog";

export { DURATION_PRESETS, TIME_SLOTS };
export type { ServiceProposalDraft };

export interface ServiceProposalModalProps {
  open: boolean;
  onClose: () => void;
  consumerId: number;
  draft?: ServiceProposalDraft;
  onDraftChange?: (draft: ServiceProposalDraft) => void;
  onSubmit: (input: CreateServiceProposalInput) => Promise<void>;
}

export function ServiceProposalModal(props: ServiceProposalModalProps) {
  const { open, onClose } = props;
  const form = useServiceProposalForm(props);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t.messaging.serviceProposal.modalTitle}
        closeLabel={t.messaging.serviceProposal.closeLabel}
      >
        <form onSubmit={form.handleSubmit} onKeyDown={form.handleKeyDown} className="p-6 space-y-6">
          {form.isSuccess ? (
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
                <ProposalPricingSection
                  amount={form.amount}
                  onChangeAmount={form.setAmount}
                  error={form.amountError}
                  disabled={form.isSubmitting}
                />

                <ProposalScheduleSection
                  schedule={{
                    scheduledDate: form.scheduledDate,
                    scheduledTime: form.scheduledTime,
                    selectedDurationPreset: form.selectedDurationPreset,
                    estimatedDurationMinutes: form.estimatedDurationMinutes,
                  }}
                  onChange={{
                    onChangeDate: form.setScheduledDate,
                    onChangeTime: form.setScheduledTime,
                    onChangeDurationPreset: form.handleChangeDurationPreset,
                    onChangeCustomDuration: form.setEstimatedDurationMinutes,
                  }}
                  errors={{
                    dateError: form.dateError,
                    durationError: form.durationError,
                  }}
                  disabled={form.isSubmitting}
                />

                <ProposalDescriptionSection
                  description={form.description}
                  onChangeDescription={form.setDescription}
                  disabled={form.isSubmitting}
                />
              </div>

              {form.submitError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 animate-in fade-in duration-200">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{form.submitError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={form.isSubmitting}
                  className="semibold cursor-pointer"
                >
                  {t.messaging.serviceProposal.cancelButton}
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={form.isSubmitDisabled}
                  className="px-6 font-semibold cursor-pointer"
                >
                  {form.isSubmitting ? t.messaging.serviceProposal.submittingButton : t.messaging.serviceProposal.submitButton}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <ProposalConfirmDialog
        open={form.isConfirming}
        onOpenChange={form.setIsConfirming}
        onConfirm={form.handleConfirmSubmit}
        isSubmitting={form.isSubmitting}
      />
    </>
  );
}
