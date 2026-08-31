export type FileUploadPurpose =
  | "profile_photo"
  | "conversation_message_image"
  | "conversation_message_audio"
  | "job_request_image"
  | "work_order_completion_image";

export interface PrepareFileUploadCommand {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: FileUploadPurpose;
}

export interface PreparedFileUpload {
  fileId: string;
  storageKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface UploadPreparedFileCommand {
  uploadUrl: string;
  file: Blob;
  headers: Record<string, string>;
}

export interface ConfirmFileUploadCommand {
  fileId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConfirmedFileUpload {
  fileId: string;
  url: string;
  originalName: string;
}

export interface FileUploadRepository {
  prepareUpload(command: PrepareFileUploadCommand): Promise<PreparedFileUpload>;
  upload(command: UploadPreparedFileCommand): Promise<void>;
  confirmUpload(command: ConfirmFileUploadCommand): Promise<ConfirmedFileUpload>;
}
