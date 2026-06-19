import type { AiChatRepository } from "@/ports/ai-chat-repository";
import type { AiConversationDetail } from "@/domain/messaging/types";

export async function getAiConversationDetail(
  repository: AiChatRepository,
  conversationId: string
): Promise<AiConversationDetail> {
  return repository.getById(conversationId);
}