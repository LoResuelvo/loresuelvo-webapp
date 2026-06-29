import { api } from "@/infrastructure/api/base-client";
import {
  PresignedUrlResponse,
  ConfirmUploadResponse,
  FileRepository
} from "@/ports/file-repository";

export class ApiFileRepository implements FileRepository {
  async getPresignedUrl(
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    purpose: string
  ): Promise<PresignedUrlResponse> {
    const result = await api.post("/files/presign", {
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      purpose: purpose,
    });
    return result as PresignedUrlResponse;
  }

  async confirmUpload(
    fileId: string,
    key: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<ConfirmUploadResponse> {
    const result = await api.post(`/files/${fileId}/confirm`, {
      key: key,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    });
    return result as ConfirmUploadResponse;
  }

  async uploadFile(
    uploadUrl: string,
    file: File | Blob,
    headers: Record<string, string>
  ): Promise<void> {
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: headers,
    });
    if (!uploadRes.ok) {
      throw new Error("Error al subir archivo a S3/R2");
    }
  }
}
