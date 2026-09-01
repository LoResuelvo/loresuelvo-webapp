import { useCallback } from "react";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { useManagedImageAttachments } from "./useManagedImageAttachments";
import {
  uploadSequentialAttachments,
  type UploadSequentialResult,
} from "./upload-sequential-attachments";
import type {
  InitialDiagnosisAttachment,
  SelectedAttachment,
  UploadingAttachment,
  UploadedAttachment,
  FailedAttachment,
} from "./initial-diagnosis-attachment";
import type { ManagedImageAttachment } from "./managed-image-attachment";

export type { UploadSequentialResult };

export function useInitialDiagnosisAttachments() {
  const managed = useManagedImageAttachments<InitialDiagnosisAttachment>({
    createAttachment: (base: ManagedImageAttachment): SelectedAttachment => ({
      id: base.id,
      file: base.file,
      previewUrl: base.previewUrl,
      status: "selected",
    }),
  });

  const uploadFile = useCallback((attachment: InitialDiagnosisAttachment) => {
    return executeFileUpload(clientFileUploadRepository, {
      file: attachment.file,
      originalName: attachment.file.name,
      mimeType: attachment.file.type,
      purpose: "conversation_message_image",
    });
  }, []);

  const uploadAllPending = useCallback(async (): Promise<UploadSequentialResult> => {
    const currentList = managed.getSnapshot();
    return uploadSequentialAttachments(currentList, {
      uploadFile,
      onStart: (id) => {
        managed.replaceAttachment(id, (current): UploadingAttachment => ({
          id: current.id,
          file: current.file,
          previewUrl: current.previewUrl,
          status: "uploading",
        }));
      },
      onSuccess: (id, confirmed) => {
        managed.replaceAttachment(id, (current): UploadedAttachment => ({
          id: current.id,
          file: current.file,
          previewUrl: current.previewUrl,
          status: "uploaded",
          uploaded: confirmed,
        }));
      },
      onFailure: (id, error) => {
        managed.replaceAttachment(id, (current): FailedAttachment => ({
          id: current.id,
          file: current.file,
          previewUrl: current.previewUrl,
          status: "failed",
          error,
        }));
      },
      isCancelled: () => !managed.isMounted(),
      isItemActive: (id) => managed.isAttachmentActive(id),
    });
  }, [managed, uploadFile]);

  return {
    attachments: managed.attachments,
    addAttachments: managed.addAttachments,
    removeAttachment: managed.removeAttachment,
    clearAttachments: managed.clearAttachments,
    uploadAllPending,
  };
}
