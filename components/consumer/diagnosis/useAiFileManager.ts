import { useState, useRef, useCallback } from "react";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { t } from "@/infrastructure/i18n/translations";
import { useAiImageAttachments } from "./attachments/useAiImageAttachments";
import type { UploadingAiImageAttachment } from "./attachments/ai-image-attachment";

export type { AiImageAttachment, AiImageAttachmentStatus } from "./attachments/ai-image-attachment";

export interface UseAiFileManagerProps {
  onUploadError?: (error: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

type SelectionError = "file-too-large" | "invalid-format" | null;

function validateSelectedImages(files: File[]): { validFiles: File[]; error: SelectionError } {
  let error: SelectionError = null;
  const validFiles = files.filter((file) => {
    if (file.size > MAX_FILE_SIZE) {
      error = "file-too-large";
      return false;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      if (error === null) error = "invalid-format";
      return false;
    }
    return true;
  });
  return { validFiles, error };
}

function selectionErrorMessage(error: SelectionError): string | null {
  if (error === "file-too-large") return t.messaging.fileTooLarge;
  if (error === "invalid-format") return t.messaging.photoInvalidFormat;
  return null;
}

function uploadImageAttachment(attachment: UploadingAiImageAttachment) {
  return executeFileUpload(clientFileUploadRepository, {
    file: attachment.file,
    originalName: attachment.file.name,
    mimeType: attachment.file.type,
    purpose: "conversation_message_image",
  });
}

export function useAiFileManager(props?: UseAiFileManagerProps) {
  const onUploadError = props?.onUploadError;
  const {
    attachments,
    addAttachments,
    markAttachmentUploaded,
    markAttachmentFailed,
    removeAttachment,
    clearAttachments,
    isAttachmentActive,
  } = useAiImageAttachments();

  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = useCallback(
    async (attachment: UploadingAiImageAttachment) => {
      if (!isAttachmentActive(attachment.id)) return;
      try {
        const confirmed = await uploadImageAttachment(attachment);
        if (!isAttachmentActive(attachment.id)) return;
        markAttachmentUploaded(attachment, confirmed);
      } catch (error) {
        if (!isAttachmentActive(attachment.id)) return;
        const message = t.aiDiagnosis.errors.imageUpload;
        console.error("Error al subir archivo inmediatamente:", error);
        markAttachmentFailed(attachment, message);
        setUploadError(message);
        onUploadError?.(message);
      }
    },
    [isAttachmentActive, markAttachmentFailed, markAttachmentUploaded, onUploadError]
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files?.length) return;
      const { validFiles, error } = validateSelectedImages(Array.from(event.target.files));
      setUploadError(selectionErrorMessage(error));

      for (const attachment of addAttachments(validFiles)) {
        await uploadAttachment(attachment);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addAttachments, uploadAttachment]
  );

  const isUploadingFiles = attachments.some((a) => a.status === "uploading");
  const hasFailedFiles = attachments.some((a) => a.status === "failed");
  const areAttachmentsReady = attachments.every((a) => a.status === "uploaded");

  return {
    attachments,
    isUploadingFiles,
    hasFailedFiles,
    areAttachmentsReady,
    handleFileChange,
    handleRemoveAttachment: removeAttachment,
    clearAttachments,
    previewImage,
    setPreviewImage,
    uploadError,
    fileInputRef,
  };
}
