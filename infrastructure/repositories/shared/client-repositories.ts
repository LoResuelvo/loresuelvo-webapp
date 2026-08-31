import { FileRepository, PresignedUrlResponse, ConfirmUploadResponse } from "@/ports/files/file-repository";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";

export class ClientFileRepository implements FileRepository {
  async getPresignedUrl(
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    purpose: string
  ): Promise<PresignedUrlResponse> {
    const res = await getPresignedUrlAction(originalName, mimeType, sizeBytes, purpose);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res.data;
  }

  async confirmUpload(
    fileId: string,
    key: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<ConfirmUploadResponse> {
    const res = await confirmUploadAction(fileId, key, mimeType, sizeBytes);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res.data;
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
