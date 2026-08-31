import { ConversationQueryRepository } from "@/ports/messaging/conversation-query-repository";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export async function getConsumerConversations(
  conversationRepository: ConversationQueryRepository
): Promise<ConsumerConversationContact[]> {
  return conversationRepository.getConsumerConversations();
}

export async function getProviderConversations(
  conversationRepository: ConversationQueryRepository
): Promise<ProviderConversationContact[]> {
  return conversationRepository.getProviderConversations();
}
