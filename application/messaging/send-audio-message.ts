import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository, ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import { executeFileUpload, FileUploadError } from "@/application/files/execute-file-upload";
import { Message } from "@/domain/messaging/types";
import { normalizeAudioMimeType } from "@/lib/audio/audio-validation";

export type AudioUploadFailureStage = "presign" | "PUT" | "confirm" | "send";

export class AudioUploadError extends Error {
  constructor(public readonly stage: AudioUploadFailureStage, cause?: unknown) {
    super(stage, { cause });
    this.name = "AudioUploadError";
  }
}

export interface SendAudioMessageParams {
  conversationId: string;
  myUserId: string;
  counterpartId: number;
  file: File | Blob;
  myRole?: "consumer" | "provider";
}

const STAGE_MAP: Record<"prepare" | "transfer" | "confirm", AudioUploadFailureStage> = {
  prepare: "presign",
  transfer: "PUT",
  confirm: "confirm",
};

export async function sendAudioMessage(
  conversationRepository: ConversationCommandRepository,
  fileRepository: FileUploadRepository,
  params: SendAudioMessageParams
): Promise<{ message: Message }> {
  const originalName = (params.file as File).name || "audio.webm";
  const mimeType = normalizeAudioMimeType(params.file.type);

  let confirmed: ConfirmedFileUpload;
  try {
    confirmed = await executeFileUpload(fileRepository, {
      file: params.file,
      originalName,
      mimeType,
      purpose: "conversation_message_audio",
    });
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw new AudioUploadError(STAGE_MAP[error.stage], error);
    }
    throw new AudioUploadError("presign", error);
  }

  let message: Message;
  try {
    message = await conversationRepository.sendAudioMessage({
      conversationId: params.conversationId,
      counterpartId: params.counterpartId,
      currentUserId: params.myUserId,
      currentUserRole: params.myRole ?? "consumer",
      audioFileId: confirmed.fileId,
    });
  } catch (error) {
    throw new AudioUploadError("send", error);
  }

  return { message };
}
