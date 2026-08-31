import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";
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
      const name = (file as File).name || "image.jpg";
      const type = file.type || "image/jpeg";
      const size = file.size;

      const prepared = await fileRepository.prepareUpload({
        originalName: name,
        mimeType: type,
        sizeBytes: size,
        purpose: "conversation_message_image",
      });

      await fileRepository.upload({
        uploadUrl: prepared.uploadUrl,
        file,
        headers: prepared.headers,
      });

      const confirmed = await fileRepository.confirmUpload({
        fileId: prepared.fileId,
        storageKey: prepared.storageKey,
        mimeType: type,
        sizeBytes: size,
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
