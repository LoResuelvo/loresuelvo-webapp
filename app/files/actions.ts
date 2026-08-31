"use server";

import { ApiFileUploadRepository } from "@/infrastructure/repositories/files/api-file-upload-repository";
import { prepareFileUpload, confirmFileUpload } from "@/application/files/upload-file";
import { getAuthService } from "@/infrastructure/auth";
import type {
  PrepareFileUploadCommand,
  PreparedFileUpload,
  ConfirmFileUploadCommand,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function prepareFileUploadAction(
  command: PrepareFileUploadCommand
): Promise<ActionResult<PreparedFileUpload>> {
  try {
    const fileRepo = new ApiFileUploadRepository();
    const authService = getAuthService();
    const data = await prepareFileUpload(fileRepo, authService, command);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener URL de subida";
    return { success: false, error: message };
  }
}

export async function confirmFileUploadAction(
  command: ConfirmFileUploadCommand
): Promise<ActionResult<ConfirmedFileUpload>> {
  try {
    const fileRepo = new ApiFileUploadRepository();
    const authService = getAuthService();
    const data = await confirmFileUpload(fileRepo, authService, command);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al confirmar subida";
    return { success: false, error: message };
  }
}
