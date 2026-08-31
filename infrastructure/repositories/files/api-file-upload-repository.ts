import { api } from "@/infrastructure/api/base-client";
import {
  FileUploadSessionRepository,
  PrepareFileUploadCommand,
  PreparedFileUpload,
  ConfirmFileUploadCommand,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";

interface PresignResponseDto {
  file_id: string;
  key: string;
  upload_url: string;
  headers: Record<string, string>;
}

interface ConfirmResponseDto {
  id: string;
  url: string;
  original_name: string;
}

export class ApiFileUploadRepository implements FileUploadSessionRepository {
  async prepareUpload(command: PrepareFileUploadCommand): Promise<PreparedFileUpload> {
    const result = await api.post<PresignResponseDto>("/files/presign", {
      original_name: command.originalName,
      mime_type: command.mimeType,
      size_bytes: command.sizeBytes,
      purpose: command.purpose,
    });

    return {
      fileId: result.file_id,
      storageKey: result.key,
      uploadUrl: result.upload_url,
      headers: result.headers,
    };
  }

  async confirmUpload(command: ConfirmFileUploadCommand): Promise<ConfirmedFileUpload> {
    const result = await api.post<ConfirmResponseDto>(`/files/${command.fileId}/confirm`, {
      key: command.storageKey,
      mime_type: command.mimeType,
      size_bytes: command.sizeBytes,
    });

    return {
      fileId: result.id,
      url: result.url,
      originalName: result.original_name,
    };
  }
}
