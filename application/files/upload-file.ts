import {
  FileUploadRepository,
  PrepareFileUploadCommand,
  PreparedFileUpload,
  ConfirmFileUploadCommand,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";
import { AuthService } from "@/ports/onboarding/auth-service";

export async function prepareFileUpload(
  fileRepository: FileUploadRepository,
  authService: AuthService,
  command: PrepareFileUploadCommand
): Promise<PreparedFileUpload> {
  const session = await authService.getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  return fileRepository.prepareUpload(command);
}

export async function confirmFileUpload(
  fileRepository: FileUploadRepository,
  authService: AuthService,
  command: ConfirmFileUploadCommand
): Promise<ConfirmedFileUpload> {
  const session = await authService.getSession();
  if (!session) {
    throw new Error("User is unauthenticated");
  }

  return fileRepository.confirmUpload(command);
}
