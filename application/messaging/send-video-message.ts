import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository, ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import { executeFileUpload, FileUploadError } from "@/application/files/execute-file-upload";
import { Message } from "@/domain/messaging/types";

export type VideoUploadFailureStage =
  | "presign"
  | "PUT"
  | "confirm"
  | "send"
  | "invalidCodec";

export class VideoUploadError extends Error {
  constructor(public readonly stage: VideoUploadFailureStage, cause?: unknown) {
    super(stage, { cause });
    this.name = "VideoUploadError";
  }
}

export interface SendVideoMessageParams {
  conversationId: string;
  myUserId: string;
  counterpartId: number;
  file: File | Blob;
  content?: string;
  myRole?: "consumer" | "provider";
}

const STAGE_MAP: Record<"prepare" | "transfer" | "confirm", VideoUploadFailureStage> = {
  prepare: "presign",
  transfer: "PUT",
  confirm: "confirm",
};

export async function sendVideoMessage(
  conversationRepository: ConversationCommandRepository,
  fileRepository: FileUploadRepository,
  params: SendVideoMessageParams
): Promise<{ message: Message }> {
  const originalName = (params.file as File).name || "video.mp4";
  const mimeType = params.file.type || "video/mp4";

  let confirmed: ConfirmedFileUpload;
  try {
    confirmed = await executeFileUpload(fileRepository, {
      file: params.file,
      originalName,
      mimeType,
      purpose: "conversation_message_video",
    });
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw new VideoUploadError(STAGE_MAP[error.stage], error);
    }
    throw new VideoUploadError("presign", error);
  }

  let message: Message;
  try {
    message = await conversationRepository.sendVideoMessage({
      conversationId: params.conversationId,
      counterpartId: params.counterpartId,
      currentUserId: params.myUserId,
      currentUserRole: params.myRole ?? "consumer",
      videoFileId: confirmed.fileId,
      content: params.content?.trim() || undefined,
    });
  } catch (error) {
    throw new VideoUploadError("send", error);
  }

  return { message };
}
