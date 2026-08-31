import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileRepository } from "@/ports/files/file-repository";
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
  fileRepository: FileRepository,
  params: SendMessageWithAttachmentsParams
): Promise<{ message: Message; conversationId: string }> {
  const uploadedImageIds: string[] = [];

  if (params.files && params.files.length > 0) {
    for (const file of params.files) {
      const name = (file as File).name || "image.jpg";
      const type = file.type || "image/jpeg";
      const size = file.size;

      const presigned = await fileRepository.getPresignedUrl(
        name,
        type,
        size,
        "conversation_message_image"
      );

      await fileRepository.uploadFile(presigned.upload_url, file, presigned.headers);

      const confirm = await fileRepository.confirmUpload(
        presigned.file_id,
        presigned.key,
        type,
        size
      );
      uploadedImageIds.push(confirm.id);
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
