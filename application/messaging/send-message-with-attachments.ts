import { ConversationRepository } from "@/ports/conversation-repository";
import { FileRepository } from "@/ports/file-repository";
import { Message } from "@/domain/messaging/types";
import { ApiConversationMessage } from "@/infrastructure/api/types";
import { transformApiMessageToDomain } from "@/infrastructure/repositories/conversation-mapper";

export interface SendMessageWithAttachmentsParams {
  conversationId: string | null;
  counterpartId: number;
  myUserId: string;
  myRole: "consumer" | "provider";
  content?: string;
  files?: (File | Blob)[];
}

export async function sendMessageWithAttachments(
  conversationRepository: ConversationRepository,
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

  let conversationIdToUse = params.conversationId;
  let isNew = false;

  if (!conversationIdToUse || !/^\d+$/.test(conversationIdToUse)) {
    const createData = await conversationRepository.create({
      counterpart_id: params.counterpartId,
      content: params.content,
      image_file_ids: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
    });
    conversationIdToUse = String(createData.id);
    isNew = true;
  }

  let apiMsg: ApiConversationMessage;

  if (isNew) {
    // If conversation is newly created, the first message details are not returned by the API create call.
    // We synthesize the message locally (equivalent to the UI optimistic message behavior).
    apiMsg = {
      id: Date.now(),
      sender_role: params.myRole,
      content: params.content,
      created_on: new Date().toISOString(),
      images: uploadedImageIds.map(id => ({
        id,
        url: "", // temp/empty URL for newly uploaded local images
        original_name: "",
      })),
    };
  } else {
    const response = await conversationRepository.sendMessage(
      conversationIdToUse,
      params.content,
      uploadedImageIds.length > 0 ? uploadedImageIds : undefined
    );
    apiMsg = response as ApiConversationMessage;
  }

  const domainMsg = transformApiMessageToDomain(
    apiMsg,
    params.myUserId,
    String(params.counterpartId),
    params.myRole
  );

  return {
    message: domainMsg,
    conversationId: conversationIdToUse,
  };
}
