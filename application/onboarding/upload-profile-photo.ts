import { FileRepository, PresignedUrlResponse, ConfirmUploadResponse } from "@/ports/file-repository";
import { AuthService } from "@/ports/auth-service";

export async function getPresignedUrl(
  fileRepository: FileRepository,
  authService: AuthService,
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  purpose: string
): Promise<PresignedUrlResponse> {
  const session = await authService.getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  return fileRepository.getPresignedUrl(originalName, mimeType, sizeBytes, purpose);
}

export async function confirmUpload(
  fileRepository: FileRepository,
  authService: AuthService,
  fileId: string,
  key: string,
  mimeType: string,
  sizeBytes: number
): Promise<ConfirmUploadResponse> {
  const session = await authService.getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  return fileRepository.confirmUpload(fileId, key, mimeType, sizeBytes);
}
