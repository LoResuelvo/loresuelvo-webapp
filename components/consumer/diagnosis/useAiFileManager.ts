import { useState, useRef, useCallback } from "react";
import { useAiImageAttachments } from "./attachments/useAiImageAttachments";
import { useAiAttachmentUploadController } from "./attachments/useAiAttachmentUploadController";
import { validateImageFiles } from "./attachments/image-attachment-validation";

export type { AiImageAttachment, AiImageAttachmentStatus } from "./attachments/ai-image-attachment";

export function useAiFileManager() {
  const attachmentsManager = useAiImageAttachments();
  const {
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    isAttachmentActive,
    markAttachmentUploading,
    markAttachmentUploaded,
    markAttachmentFailed,
  } = attachmentsManager;

  const uploadController = useAiAttachmentUploadController({
    isAttachmentActive,
    markAttachmentUploading,
    markAttachmentUploaded,
    markAttachmentFailed,
  });

  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files?.length) return;
      const { validFiles, error } = validateImageFiles(Array.from(event.target.files));
      setUploadError(error);

      for (const attachment of addAttachments(validFiles)) {
        await uploadController.uploadAttachment(attachment);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addAttachments, uploadController]
  );

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      removeAttachment(id);
      const remaining = attachments.filter((a) => a.id !== id);
      uploadController.handleAttachmentRemoved(remaining);
    },
    [attachments, removeAttachment, uploadController]
  );

  const handleClearAttachments = useCallback(() => {
    clearAttachments();
    uploadController.clearUploadError();
    setUploadError(null);
  }, [clearAttachments, uploadController]);

  const retryFailedUploads = useCallback(async () => {
    await uploadController.retryFailedUploads(attachments);
  }, [attachments, uploadController]);

  const isUploadingFiles = attachments.some((a) => a.status === "uploading");
  const hasFailedFiles = attachments.some((a) => a.status === "failed");
  const areAttachmentsReady = attachments.every((a) => a.status === "uploaded");

  return {
    attachments,
    isUploadingFiles,
    hasFailedFiles,
    areAttachmentsReady,
    handleFileChange,
    handleRemoveAttachment,
    clearAttachments: handleClearAttachments,
    retryFailedUploads,
    fileUploadError: uploadController.fileUploadError,
    previewImage,
    setPreviewImage,
    uploadError,
    fileInputRef,
  };
}
