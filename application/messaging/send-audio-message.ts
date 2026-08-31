import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileRepository } from "@/ports/files/file-repository";
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
  fileRepository: FileRepository,
  params: SendAudioMessageParams
): Promise<{ message: Message }> {
  const originalName = (params.file as File).name || "audio.webm";
  const mimeType = normalizeAudioMimeType(params.file.type);
  let presigned;
  try {
    presigned = await fileRepository.getPresignedUrl(
      originalName,
      mimeType,
      params.file.size,
      "conversation_message_audio"
    );
  } catch (error) {
    throw new AudioUploadError("presign", error);
  }

  try {
    await fileRepository.uploadFile(presigned.upload_url, params.file, presigned.headers);
  } catch (error) {
    throw new AudioUploadError("PUT", error);
  }

  let confirmed;
  try {
    confirmed = await fileRepository.confirmUpload(
      presigned.file_id,
      presigned.key,
      mimeType,
      params.file.size
    );
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
      audioFileId: confirmed.id,
    });
  } catch (error) {
    throw new AudioUploadError("send", error);
  }

  return { message };
}
