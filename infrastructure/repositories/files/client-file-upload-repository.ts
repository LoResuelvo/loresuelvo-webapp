import {
  FileUploadRepository,
  PrepareFileUploadCommand,
  PreparedFileUpload,
  UploadPreparedFileCommand,
  ConfirmFileUploadCommand,
  ConfirmedFileUpload,
} from "@/ports/files/file-upload-repository";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ClientFileUploadRepositoryActions {
  prepareUpload: (command: PrepareFileUploadCommand) => Promise<ActionResult<PreparedFileUpload>>;
  confirmUpload: (command: ConfirmFileUploadCommand) => Promise<ActionResult<ConfirmedFileUpload>>;
}

export class ClientFileUploadRepository implements FileUploadRepository {
  constructor(private actions: ClientFileUploadRepositoryActions) {}

  async prepareUpload(command: PrepareFileUploadCommand): Promise<PreparedFileUpload> {
    const res = await this.actions.prepareUpload(command);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res.data;
  }

  async confirmUpload(command: ConfirmFileUploadCommand): Promise<ConfirmedFileUpload> {
    const res = await this.actions.confirmUpload(command);
    if (!res.success) {
      throw new Error(res.error);
    }
    return res.data;
  }

  async upload(command: UploadPreparedFileCommand): Promise<void> {
    const uploadRes = await fetch(command.uploadUrl, {
      method: "PUT",
      body: command.file,
      headers: command.headers,
    });
    if (!uploadRes.ok) {
      throw new Error("Error al subir archivo a S3/R2");
    }
  }
}
