"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { useFileUpload } from "@/hooks/useFileUpload";
import { reportWorkCompletionAction } from "@/app/work-orders/actions";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ReportWorkCompletionModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId: number;
  onSuccess?: () => void;
}

export default function ReportWorkCompletionModal({
  open,
  onClose,
  workOrderId,
  onSuccess,
}: ReportWorkCompletionModalProps) {
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFiles, isUploading } = useFileUpload();

  const maxImages = 3;
  const isFormValid =
    selectedImages.length >= 1 &&
    selectedImages.length <= maxImages &&
    description.trim().length > 0;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const availableSlots = maxImages - selectedImages.length;
    const filesToAdd = newFiles.slice(0, availableSlots);

    const newSelected: SelectedImage[] = filesToAdd.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...newSelected]);
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (idToRemove: string) => {
    setSelectedImages((prev) => {
      const itemToRemove = prev.find((item) => item.id === idToRemove);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
    setErrorMessage(null);
  };

  const handleClose = () => {
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    setDescription("");
    setErrorMessage(null);
    if (isSuccess) {
      onSuccess?.();
    }
    setIsSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting || isUploading) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const filesToUpload = selectedImages.map((img) => img.file);
      const uploadResults = await uploadMultipleFiles(filesToUpload, {
        purpose: "work_order_completion_image",
      });

      const imageFileIds = uploadResults.map((res) => res.fileId);

      const result = await reportWorkCompletionAction(workOrderId, description.trim(), imageFileIds);

      if (!result.ok) {
        const msg = (result.message || "").toLowerCase();
        if (result.status === 409) {
          if (msg.includes("not ready") || msg.includes("scheduled") || msg.includes("fecha")) {
            setErrorMessage(t.workOrderCompletion.errors.futureScheduledDate);
          } else {
            setErrorMessage(t.workOrderCompletion.errors.alreadyReported);
          }
        } else if (result.status === 400) {
          if (msg.includes("description") || msg.includes("descripción")) {
            setErrorMessage(t.workOrderCompletion.errors.requiredDescription);
          } else {
            setErrorMessage(t.workOrderCompletion.errors.requiredImages);
          }
        } else if (result.status === 403) {
          setErrorMessage(t.workOrderCompletion.errors.unauthorized);
        } else {
          setErrorMessage(t.workOrderCompletion.errors.generic);
        }
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : t.workOrderCompletion.errors.generic
      );
      setIsSubmitting(false);
    }
  };

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

            {/* Evidence Images Upload */}
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

              {/* Previews Grid */}
              <div className="grid grid-cols-3 gap-3">
                {selectedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt={`Vista previa de ${img.file.name}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      disabled={isSubmitting || isUploading}
                      aria-label={`${t.workOrderCompletion.removeImageText} ${img.file.name}`}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-caption font-medium">
                      #{index + 1}
                    </span>
                  </div>
                ))}

                {selectedImages.length < maxImages && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading}
                    className={cn(
                      "aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-brand-primary cursor-pointer p-2",
                      (isSubmitting || isUploading) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs font-medium text-center">
                      {t.workOrderCompletion.uploadButtonText}
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                data-testid="completion-file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting || isUploading}
              />

              <p className="text-xs text-slate-500">
                {t.workOrderCompletion.evidenceImagesHelp}
              </p>
            </div>

            {/* Work Done Description */}
            <div className="space-y-2">
              <label
                htmlFor="completion-description"
                className="text-sm font-semibold text-slate-700"
              >
                {t.workOrderCompletion.descriptionLabel}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                id="completion-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder={t.workOrderCompletion.descriptionPlaceholder}
                disabled={isSubmitting || isUploading}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary text-sm text-slate-800 placeholder:text-slate-400 transition-all resize-none disabled:bg-slate-50 disabled:opacity-70"
              />
            </div>

            {/* Footer Buttons */}
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
