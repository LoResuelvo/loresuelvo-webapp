import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import type { InitialDiagnosisAttachment } from "./initial-diagnosis-attachment";

export type UploadSequentialResult =
  | { status: "completed"; imageIds: string[] }
  | { status: "cancelled" };

export interface UploadSequentialDependencies {
  uploadFile: (attachment: InitialDiagnosisAttachment) => Promise<ConfirmedFileUpload>;
  onStart: (id: string) => void;
  onSuccess: (id: string, confirmed: ConfirmedFileUpload) => void;
  onFailure: (id: string, error: string) => void;
  isCancelled: () => boolean;
  isItemActive: (id: string) => boolean;
}

export async function uploadSequentialAttachments(
  items: InitialDiagnosisAttachment[],
  deps: UploadSequentialDependencies
): Promise<UploadSequentialResult> {
  const imageIds: string[] = [];

  for (const item of items) {
    if (deps.isCancelled()) return { status: "cancelled" };
    if (!deps.isItemActive(item.id)) continue;

    if (item.status === "uploaded" && item.uploaded?.fileId) {
      imageIds.push(item.uploaded.fileId);
      continue;
    }

    deps.onStart(item.id);

    try {
      const confirmed = await deps.uploadFile(item);
      if (deps.isCancelled()) return { status: "cancelled" };
      if (!deps.isItemActive(item.id)) continue;

      deps.onSuccess(item.id, confirmed);
      imageIds.push(confirmed.fileId);
    } catch (error) {
      if (deps.isCancelled()) return { status: "cancelled" };
      if (deps.isItemActive(item.id)) {
        const message = error instanceof Error ? error.message : "Error al subir archivo";
        deps.onFailure(item.id, message);
      }
      throw error;
    }
  }

  if (deps.isCancelled()) return { status: "cancelled" };
  return { status: "completed", imageIds };
}
