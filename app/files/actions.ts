"use server";

import { ApiFileRepository } from "@/infrastructure/repositories/files/api-file-repository";
import { getPresignedUrl, confirmUpload } from "@/application/files/upload-file";
import { getAuthService } from "@/infrastructure/auth";
import type { PresignedUrlResponse, ConfirmUploadResponse } from "@/ports/files/file-repository";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getPresignedUrlAction(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  purpose: string
): Promise<ActionResult<PresignedUrlResponse>> {
  try {
    const fileRepo = new ApiFileRepository();
    const authService = getAuthService();
    const data = await getPresignedUrl(fileRepo, authService, originalName, mimeType, sizeBytes, purpose);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener URL de subida";
    return { success: false, error: message };
  }
}

export async function confirmUploadAction(
  fileId: string,
  key: string,
  mimeType: string,
  sizeBytes: number
): Promise<ActionResult<ConfirmUploadResponse>> {
  try {
    const fileRepo = new ApiFileRepository();
    const authService = getAuthService();
    const data = await confirmUpload(fileRepo, authService, fileId, key, mimeType, sizeBytes);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al confirmar subida";
    return { success: false, error: message };
  }
}
