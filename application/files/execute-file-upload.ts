import {
  FileUploadPurpose,
  FileUploadRepository,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";

export type FileUploadStage = "prepare" | "transfer" | "confirm";

export class FileUploadError extends Error {
  readonly stage: FileUploadStage;

  constructor(stage: FileUploadStage, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FileUploadError";
    this.stage = stage;
  }
}

export interface ExecuteFileUploadCommand {
  file: Blob;
  originalName: string;
  mimeType: string;
  purpose: FileUploadPurpose;
}

export async function executeFileUpload(
  repository: FileUploadRepository,
  command: ExecuteFileUploadCommand
): Promise<ConfirmedFileUpload> {
  const sizeBytes = command.file.size;

  let prepared;
  try {
    prepared = await repository.prepareUpload({
      originalName: command.originalName,
      mimeType: command.mimeType,
      sizeBytes,
      purpose: command.purpose,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al preparar la subida de archivo";
    throw new FileUploadError("prepare", message, { cause: error });
  }

  try {
    await repository.upload({
      uploadUrl: prepared.uploadUrl,
      file: command.file,
      headers: prepared.headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al transferir el archivo";
    throw new FileUploadError("transfer", message, { cause: error });
  }

  let confirmed;
  try {
    confirmed = await repository.confirmUpload({
      fileId: prepared.fileId,
      storageKey: prepared.storageKey,
      mimeType: command.mimeType,
      sizeBytes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al confirmar la subida de archivo";
    throw new FileUploadError("confirm", message, { cause: error });
  }

  return confirmed;
}
