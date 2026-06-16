import { ConversationDetail, ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export interface ConversationRepository {
  getConsumerConversations(): Promise<ConsumerConversationContact[]>;
  getProviderConversations(): Promise<ProviderConversationContact[]>;
  getById(id: string): Promise<ConversationDetail>;
  create(data: { counterpart_id: number; content: string }): Promise<{ id: number }>;
  sendMessage(conversationId: string, content: string): Promise<unknown>;
}
