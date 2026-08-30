import { useState, useRef, ChangeEvent } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { reportWorkCompletionAction } from "@/app/work-orders/actions";
import { t } from "@/infrastructure/i18n/translations";

export interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface UseReportCompletionFormOptions {
  workOrderId: number;
  onSuccess?: () => void;
  onClose: () => void;
  maxImages?: number;
}

export function useReportCompletionForm({
  workOrderId,
  onSuccess,
  onClose,
  maxImages = 3,
}: UseReportCompletionFormOptions) {
  const [description, setDescriptionState] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFiles, isUploading } = useFileUpload();

  const isFormValid =
    selectedImages.length >= 1 &&
    selectedImages.length <= maxImages &&
    description.trim().length > 0;

  const setDescription = (value: string) => {
    setDescriptionState(value);
    setErrorMessage(null);
  };

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
    setDescriptionState("");
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

  return {
    description,
    setDescription,
    selectedImages,
    isSubmitting,
    isUploading,
    errorMessage,
    setErrorMessage,
    isSuccess,
    maxImages,
    isFormValid,
    fileInputRef,
    handleFileChange,
    handleRemoveImage,
    handleClose,
    handleSubmit,
  };
}
