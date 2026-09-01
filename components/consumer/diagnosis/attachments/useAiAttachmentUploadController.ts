import { useState, useCallback } from "react";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { t } from "@/infrastructure/i18n/translations";
import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import type {
  AiImageAttachment,
  UploadingAiImageAttachment,
} from "./ai-image-attachment";

export interface UseAiAttachmentUploadControllerDependencies {
  isAttachmentActive: (id: string) => boolean;
  markAttachmentUploading: (id: string) => void;
  markAttachmentUploaded: (attachment: UploadingAiImageAttachment, confirmed: ConfirmedFileUpload) => void;
  markAttachmentFailed: (attachment: UploadingAiImageAttachment, error: string) => void;
}

function uploadImageAttachment(attachment: UploadingAiImageAttachment) {
  return executeFileUpload(clientFileUploadRepository, {
    file: attachment.file,
    originalName: attachment.file.name,
    mimeType: attachment.file.type,
    purpose: "conversation_message_image",
  });
}

export function useAiAttachmentUploadController(deps: UseAiAttachmentUploadControllerDependencies) {
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const uploadAttachment = useCallback(
    async (attachment: UploadingAiImageAttachment) => {
      if (!deps.isAttachmentActive(attachment.id)) return;
      try {
        const confirmed = await uploadImageAttachment(attachment);
        if (!deps.isAttachmentActive(attachment.id)) return;
        deps.markAttachmentUploaded(attachment, confirmed);
      } catch (error) {
        if (!deps.isAttachmentActive(attachment.id)) return;
        const message = t.aiDiagnosis.errors.imageUpload;
        console.error("Error al subir archivo inmediatamente:", error);
        deps.markAttachmentFailed(attachment, message);
        setFileUploadError(message);
      }
    },
    [deps]
  );

  const retryFailedUploads = useCallback(
    async (attachments: AiImageAttachment[]) => {
      const failed = attachments.filter((a) => a.status === "failed");
      if (failed.length === 0) {
        setFileUploadError(null);
        return;
      }

      setFileUploadError(null);
      for (const failedItem of failed) {
        deps.markAttachmentUploading(failedItem.id);
        const uploadingItem: UploadingAiImageAttachment = {
          id: failedItem.id,
          file: failedItem.file,
          previewUrl: failedItem.previewUrl,
          status: "uploading",
        };
        await uploadAttachment(uploadingItem);
      }
    },
    [deps, uploadAttachment]
  );

  const handleAttachmentRemoved = useCallback((remaining: AiImageAttachment[]) => {
    if (!remaining.some((a) => a.status === "failed")) {
      setFileUploadError(null);
    }
  }, []);

  const clearUploadError = useCallback(() => {
    setFileUploadError(null);
  }, []);

  return {
    fileUploadError,
    uploadAttachment,
    retryFailedUploads,
    handleAttachmentRemoved,
    clearUploadError,
  };
}
