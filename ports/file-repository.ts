export interface PresignedUrlResponse {
  file_id: string;
  key: string;
  upload_url: string;
  headers: Record<string, string>;
}

export interface ConfirmUploadResponse {
  id: string;
  url: string;
  original_name: string;
}

export interface FileRepository {
  getPresignedUrl(
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    purpose: string
  ): Promise<PresignedUrlResponse>;

  confirmUpload(
    fileId: string,
    key: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<ConfirmUploadResponse>;
}
