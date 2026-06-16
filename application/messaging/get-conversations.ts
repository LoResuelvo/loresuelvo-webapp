import { ConversationRepository } from "@/ports/conversation-repository";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";
import { transformApiToConsumerContact, transformApiToProviderContact } from "@/domain/messaging/conversation-mapper";

export async function getConsumerConversations(
  conversationRepository: ConversationRepository
): Promise<ConsumerConversationContact[]> {
  try {
    const apiConversations = await conversationRepository.getAll();
    return apiConversations.map(transformApiToConsumerContact);
  } catch (error) {
    console.error("Error fetching consumer conversations in use case:", error);
    return [];
  }
}

export async function getProviderConversations(
  conversationRepository: ConversationRepository
): Promise<ProviderConversationContact[]> {
  try {
    const apiConversations = await conversationRepository.getAll();
    return apiConversations.map(transformApiToProviderContact);
  } catch (error) {
    console.error("Error fetching provider conversations in use case:", error);
    return [];
  }
}
