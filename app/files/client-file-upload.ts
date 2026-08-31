import { prepareFileUploadAction, confirmFileUploadAction } from "@/app/files/actions";
import { ClientFileUploadRepository } from "@/infrastructure/repositories/files/client-file-upload-repository";

export const clientFileUploadRepository = new ClientFileUploadRepository({
  prepareUpload: prepareFileUploadAction,
  confirmUpload: confirmFileUploadAction,
});
