import { ConversationRepository } from "@/ports/conversation-repository";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export async function getConsumerConversations(
  conversationRepository: ConversationRepository
): Promise<ConsumerConversationContact[]> {
  try {
    return conversationRepository.getConsumerConversations();
  } catch (error) {
    console.error("Error fetching consumer conversations in use case:", error);
    return [];
  }
}

export async function getProviderConversations(
  conversationRepository: ConversationRepository
): Promise<ProviderConversationContact[]> {
  try {
    return conversationRepository.getProviderConversations();
  } catch (error) {
    console.error("Error fetching provider conversations in use case:", error);
    return [];
  }
}
