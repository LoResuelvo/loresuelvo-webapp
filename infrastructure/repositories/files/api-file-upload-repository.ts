import { api } from "@/infrastructure/api/base-client";
import {
  FileUploadRepository,
  PrepareFileUploadCommand,
  PreparedFileUpload,
  UploadPreparedFileCommand,
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

export class ApiFileUploadRepository implements FileUploadRepository {
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

  async upload(command: UploadPreparedFileCommand): Promise<void> {
    const uploadRes = await fetch(command.uploadUrl, {
      method: "PUT",
      body: command.file,
      headers: command.headers,
    });
    if (!uploadRes.ok) {
      throw new Error("Error al subir archivo a S3/R2");
    }
  }
}
