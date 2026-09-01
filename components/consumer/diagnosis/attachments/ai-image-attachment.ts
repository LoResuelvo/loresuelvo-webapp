import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import type { ManagedImageAttachment } from "./managed-image-attachment";

export type AiImageAttachmentStatus = "uploading" | "uploaded" | "failed";

export type UploadingAiImageAttachment = ManagedImageAttachment & {
  status: "uploading";
  uploaded?: never;
  error?: never;
};

export type UploadedAiImageAttachment = ManagedImageAttachment & {
  status: "uploaded";
  uploaded: ConfirmedFileUpload;
  error?: never;
};

export type FailedAiImageAttachment = ManagedImageAttachment & {
  status: "failed";
  uploaded?: never;
  error: string;
};

export type AiImageAttachment =
  | UploadingAiImageAttachment
  | UploadedAiImageAttachment
  | FailedAiImageAttachment;
