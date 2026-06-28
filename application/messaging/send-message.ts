import { ConversationRepository } from "@/ports/conversation-repository";

export async function createConversation(
  conversationRepository: ConversationRepository,
  counterpartId: number,
  content: string
): Promise<{ id: number }> {
  const conversation = await conversationRepository.create({ counterpart_id: counterpartId, content });
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
