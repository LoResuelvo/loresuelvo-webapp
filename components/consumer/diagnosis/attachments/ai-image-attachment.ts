import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";

export type AiImageAttachmentStatus = "uploading" | "uploaded" | "failed";

interface AiImageAttachmentBase {
  id: string;
  file: File;
  previewUrl: string;
}

export type UploadingAiImageAttachment = AiImageAttachmentBase & {
  status: "uploading";
  uploaded?: never;
  error?: never;
};

export type UploadedAiImageAttachment = AiImageAttachmentBase & {
  status: "uploaded";
  uploaded: ConfirmedFileUpload;
  error?: never;
};

export type FailedAiImageAttachment = AiImageAttachmentBase & {
  status: "failed";
  uploaded?: never;
  error: string;
};

export type AiImageAttachment =
  | UploadingAiImageAttachment
  | UploadedAiImageAttachment
  | FailedAiImageAttachment;
