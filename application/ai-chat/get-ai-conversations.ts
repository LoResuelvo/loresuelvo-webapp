import type { AiChatRepository } from "@/ports/ai-chat-repository";
import type { AiConversationContact, AiConversationDetail } from "@/domain/messaging/types";

export async function getAiConversations(
  repository: AiChatRepository
): Promise<AiConversationContact[]> {
  return repository.getConversations();
}

export async function getAiConversationDetail(
  repository: AiChatRepository,
  id: string
): Promise<AiConversationDetail> {
  return repository.getById(id);
}

export async function sendAiMessage(
  repository: AiChatRepository,
  conversationId: string,
  content: string
): Promise<AiConversationDetail> {
  return repository.sendMessage(conversationId, content);
}

export async function createAiConversation(
  repository: AiChatRepository,
  content: string
): Promise<AiConversationDetail> {
  return repository.create(content);
}
