import { useCallback } from "react";
import { useManagedImageAttachments } from "./useManagedImageAttachments";
import type {
  AiImageAttachment,
  UploadingAiImageAttachment,
  UploadedAiImageAttachment,
  FailedAiImageAttachment,
} from "./ai-image-attachment";
import type { ManagedImageAttachment } from "./managed-image-attachment";
import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";

export function useAiImageAttachments() {
  const managed = useManagedImageAttachments<AiImageAttachment>({
    createAttachment: (base: ManagedImageAttachment): UploadingAiImageAttachment => ({
      id: base.id,
      file: base.file,
      previewUrl: base.previewUrl,
      status: "uploading",
    }),
  });

  const addAttachments = useCallback(
    (files: File[]): UploadingAiImageAttachment[] => {
      return managed.addAttachments(files) as UploadingAiImageAttachment[];
    },
    [managed]
  );

  const markAttachmentUploading = useCallback(
    (id: string) => {
      managed.replaceAttachment(id, (current): UploadingAiImageAttachment => ({
        id: current.id,
        file: current.file,
        previewUrl: current.previewUrl,
        status: "uploading",
      }));
    },
    [managed]
  );

  const markAttachmentUploaded = useCallback(
    (attachment: UploadingAiImageAttachment, confirmed: ConfirmedFileUpload) => {
      managed.replaceAttachment(attachment.id, (current): UploadedAiImageAttachment => ({
        id: current.id,
        file: current.file,
        previewUrl: current.previewUrl,
        status: "uploaded",
        uploaded: confirmed,
      }));
    },
    [managed]
  );

  const markAttachmentFailed = useCallback(
    (attachment: UploadingAiImageAttachment, error: string) => {
      managed.replaceAttachment(attachment.id, (current): FailedAiImageAttachment => ({
        id: current.id,
        file: current.file,
        previewUrl: current.previewUrl,
        status: "failed",
        error,
      }));
    },
    [managed]
  );

  return {
    attachments: managed.attachments,
    addAttachments,
    markAttachmentUploading,
    markAttachmentUploaded,
    markAttachmentFailed,
    removeAttachment: managed.removeAttachment,
    clearAttachments: managed.clearAttachments,
    isAttachmentActive: managed.isAttachmentActive,
  };
}
