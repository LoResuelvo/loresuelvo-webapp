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
}
