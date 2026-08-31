import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";
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

export async function sendAudioMessage(
  conversationRepository: ConversationCommandRepository,
  fileRepository: FileUploadRepository,
  params: SendAudioMessageParams
): Promise<{ message: Message }> {
  const originalName = (params.file as File).name || "audio.webm";
  const mimeType = normalizeAudioMimeType(params.file.type);
  let prepared;
  try {
    prepared = await fileRepository.prepareUpload({
      originalName,
      mimeType,
      sizeBytes: params.file.size,
      purpose: "conversation_message_audio",
    });
  } catch (error) {
    throw new AudioUploadError("presign", error);
  }

  try {
    await fileRepository.upload({
      uploadUrl: prepared.uploadUrl,
      file: params.file,
      headers: prepared.headers,
    });
  } catch (error) {
    throw new AudioUploadError("PUT", error);
  }

  let confirmed;
  try {
    confirmed = await fileRepository.confirmUpload({
      fileId: prepared.fileId,
      storageKey: prepared.storageKey,
      mimeType,
      sizeBytes: params.file.size,
    });
  } catch (error) {
    throw new AudioUploadError("confirm", error);
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
