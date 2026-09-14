import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository, ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import { executeFileUpload, FileUploadError } from "@/application/files/execute-file-upload";
import { Message } from "@/domain/messaging/types";

export type VideoUploadFailureStage =
  | "presign"
  | "PUT"
  | "confirm"
  | "send"
  | "invalidCodec"
  | "pendingLimit";

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

function isCodecError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") return /codec/i.test(error);
  if (error instanceof Error) {
    if (/codec/i.test(error.message)) return true;
    if ("cause" in error && isCodecError(error.cause)) return true;
    if ("body" in error) {
      const body = (error as { body?: unknown }).body;
      if (typeof body === "object" && body !== null) {
        return /codec/i.test(JSON.stringify(body));
      }
    }
  }
  return false;
}

function isPendingLimitError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") return /l[íi]mite/i.test(error);
  if (error instanceof Error) {
    if (/l[íi]mite/i.test(error.message)) return true;
    if ("cause" in error && isPendingLimitError(error.cause)) return true;
    if ("status" in error && (error as { status?: number }).status === 429) return true;
    if ("statusCode" in error && (error as { statusCode?: number }).statusCode === 429) return true;
    if ("body" in error) {
      const body = (error as { body?: unknown }).body;
      if (typeof body === "object" && body !== null) {
        return /l[íi]mite/i.test(JSON.stringify(body));
      }
    }
  }
  return false;
}

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
    if (isCodecError(error)) {
      throw new VideoUploadError("invalidCodec", error);
    }
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
    if (isPendingLimitError(error)) {
      throw new VideoUploadError("pendingLimit", error);
    }
    if (isCodecError(error)) {
      throw new VideoUploadError("invalidCodec", error);
    }
    throw new VideoUploadError("send", error);
  }

  return { message };
}
