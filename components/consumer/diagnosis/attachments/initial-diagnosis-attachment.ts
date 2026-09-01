import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import type { ManagedImageAttachment } from "./managed-image-attachment";

export type InitialDiagnosisAttachmentStatus = "selected" | "uploading" | "uploaded" | "failed";

export interface SelectedAttachment extends ManagedImageAttachment {
  status: "selected";
  uploaded?: never;
  error?: never;
}

export interface UploadingAttachment extends ManagedImageAttachment {
  status: "uploading";
  uploaded?: never;
  error?: never;
}

export interface UploadedAttachment extends ManagedImageAttachment {
  status: "uploaded";
  uploaded: ConfirmedFileUpload;
  error?: never;
}

export interface FailedAttachment extends ManagedImageAttachment {
  status: "failed";
  uploaded?: never;
  error: string;
}

export type InitialDiagnosisAttachment =
  | SelectedAttachment
  | UploadingAttachment
  | UploadedAttachment
  | FailedAttachment;
