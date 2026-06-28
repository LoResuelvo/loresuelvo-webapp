import { ConversationRepository } from "@/ports/conversation-repository";

export async function createConversation(
  conversationRepository: ConversationRepository,
  counterpartId: number,
  content?: string,
  imageFileIds?: string[]
): Promise<{ id: number }> {
  const conversation = await conversationRepository.create({ counterpart_id: counterpartId, content, image_file_ids: imageFileIds });
  return { id: conversation.id };
}

export async function sendMessage(
  conversationRepository: ConversationRepository,
  conversationId: string,
  content?: string,
  imageFileIds?: string[]
) {
  return conversationRepository.sendMessage(conversationId, content, imageFileIds);
}
