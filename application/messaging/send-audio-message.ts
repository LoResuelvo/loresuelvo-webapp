import { AudioConversationRepository } from "@/ports/audio-conversation-repository";
import { FileRepository } from "@/ports/file-repository";
import { Message } from "@/domain/messaging/types";
import { ApiConversationMessage } from "@/infrastructure/api/types";
import { transformApiMessageToDomain } from "@/infrastructure/repositories/conversation-mapper";

export interface SendAudioMessageParams {
  conversationId: string;
  myUserId: string;
  counterpartId: number;
  file: File | Blob;
  myRole?: "consumer" | "provider";
}

export async function sendAudioMessage(
  conversationRepository: AudioConversationRepository,
  fileRepository: FileRepository,
  params: SendAudioMessageParams
): Promise<{ message: Message }> {
  const originalName = (params.file as File).name || "audio.webm";
  const mimeType = params.file.type || "audio/webm";
  const presigned = await fileRepository.getPresignedUrl(
    originalName,
    mimeType,
    params.file.size,
    "conversation_message_audio"
  );

  await fileRepository.uploadFile(presigned.upload_url, params.file, presigned.headers);

  const confirmed = await fileRepository.confirmUpload(
    presigned.file_id,
    presigned.key,
    mimeType,
    params.file.size
  );

  const response = await conversationRepository.sendAudioMessage(params.conversationId, {
    kind: "audio",
    audioFileId: confirmed.id,
  });

  return {
    message: transformApiMessageToDomain(
      response as ApiConversationMessage,
      params.myUserId,
      String(params.counterpartId),
      params.myRole ?? "consumer"
    ),
  };
}
