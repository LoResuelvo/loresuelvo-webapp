import { ConversationRepository } from "@/ports/conversation-repository";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export async function getConsumerConversations(
  conversationRepository: ConversationRepository
): Promise<ConsumerConversationContact[]> {
  return conversationRepository.getConsumerConversations();
}

export async function getProviderConversations(
  conversationRepository: ConversationRepository
): Promise<ProviderConversationContact[]> {
  return conversationRepository.getProviderConversations();
}
