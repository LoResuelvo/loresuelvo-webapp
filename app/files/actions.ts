"use server";

import { ApiFileRepository } from "@/infrastructure/repositories/api-file-repository";
import { getPresignedUrl, confirmUpload } from "@/application/files/upload-file";
import { getAuthService } from "@/infrastructure/auth";

export async function getPresignedUrlAction(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  purpose: string
) {
  const fileRepo = new ApiFileRepository();
  const authService = getAuthService();
  return getPresignedUrl(fileRepo, authService, originalName, mimeType, sizeBytes, purpose);
}

export async function confirmUploadAction(
  fileId: string,
  key: string,
  mimeType: string,
  sizeBytes: number
) {
  const fileRepo = new ApiFileRepository();
  const authService = getAuthService();
  return confirmUpload(fileRepo, authService, fileId, key, mimeType, sizeBytes);
}
