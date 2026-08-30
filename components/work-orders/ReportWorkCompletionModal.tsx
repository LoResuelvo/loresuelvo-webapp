"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useReportCompletionForm } from "./useReportCompletionForm";
import { EvidenceGrid } from "./EvidenceGrid";
import { EvidenceDropzone } from "./EvidenceDropzone";
import { CompletionFormFields } from "./CompletionFormFields";

export interface ReportWorkCompletionModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId: number;
  onSuccess?: () => void;
}

export function ReportWorkCompletionModal({
  open,
  onClose,
  workOrderId,
  onSuccess,
}: ReportWorkCompletionModalProps) {
  const {
    description,
    setDescription,
    selectedImages,
    isSubmitting,
    isUploading,
    errorMessage,
    isSuccess,
    maxImages,
    isFormValid,
    fileInputRef,
    handleFileChange,
    handleRemoveImage,
    handleClose,
    handleSubmit,
  } = useReportCompletionForm({
    workOrderId,
    onSuccess,
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t.workOrderCompletion.modalTitle}
      closeLabel={t.workOrderCompletion.closeButton}
    >
      <div className="p-6 space-y-6" data-testid="report-work-completion-modal">
        {isSuccess ? (
          <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">
                {t.workOrderCompletion.successMessage}
              </h3>
            </div>
            <div className="pt-4">
              <Button
                variant="brand"
                onClick={handleClose}
                className="w-full sm:w-auto px-8 cursor-pointer"
              >
                {t.workOrderCompletion.closeButton}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {t.workOrderCompletion.modalDescription}
            </p>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  {t.workOrderCompletion.evidenceImagesLabel}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedImages.length}/{maxImages} fotos
                </span>
              </div>

              <EvidenceGrid
                images={selectedImages}
                onRemove={handleRemoveImage}
                disabled={isSubmitting || isUploading}
              >
                <EvidenceDropzone
                  fileInputRef={fileInputRef}
                  onFileChange={handleFileChange}
                  disabled={isSubmitting || isUploading}
                  hidden={selectedImages.length >= maxImages}
                />
              </EvidenceGrid>

              <p className="text-xs text-slate-500">
                {t.workOrderCompletion.evidenceImagesHelp}
              </p>
            </div>

            <CompletionFormFields
              description={description}
              onChange={setDescription}
              disabled={isSubmitting || isUploading}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting || isUploading}
              >
                {t.workOrderCompletion.closeButton}
              </Button>
              <Button
                type="button"
                variant="brand"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting || isUploading}
                className="min-w-[140px]"
              >
                {isSubmitting || isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.workOrderCompletion.submittingButton}
                  </span>
                ) : (
                  t.workOrderCompletion.submitButton
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ReportWorkCompletionModal;
