import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { Message } from "@/domain/messaging/types";

export interface SendMessageWithAttachmentsParams {
  conversationId: string | null;
  counterpartId: number;
  myUserId: string;
  myRole: "consumer" | "provider";
  content?: string;
  files?: (File | Blob)[];
}

export async function sendMessageWithAttachments(
  conversationRepository: ConversationCommandRepository,
  fileRepository: FileUploadRepository,
  params: SendMessageWithAttachmentsParams
): Promise<{ message: Message; conversationId: string }> {
  const uploadedImageIds: string[] = [];

  if (params.files && params.files.length > 0) {
    for (const file of params.files) {
      const originalName = (file as File).name || "image.jpg";
      const mimeType = file.type || "image/jpeg";

      const confirmed = await executeFileUpload(fileRepository, {
        file,
        originalName,
        mimeType,
        purpose: "conversation_message_image",
      });
      uploadedImageIds.push(confirmed.fileId);
    }
  }

  const imageFileIds = uploadedImageIds.length > 0 ? uploadedImageIds : undefined;

  if (!params.conversationId || !/^\d+$/.test(params.conversationId)) {
    const created = await conversationRepository.create({
      counterpartId: params.counterpartId,
      currentUserId: params.myUserId,
      currentUserRole: params.myRole,
      content: params.content,
      imageFileIds,
    });
    return {
      conversationId: created.conversationId,
      message: created.message,
    };
  }

  const message = await conversationRepository.sendMessage({
    conversationId: params.conversationId,
    counterpartId: params.counterpartId,
    currentUserId: params.myUserId,
    currentUserRole: params.myRole,
    content: params.content,
    imageFileIds,
  });

  return {
    conversationId: params.conversationId,
    message,
  };
}
