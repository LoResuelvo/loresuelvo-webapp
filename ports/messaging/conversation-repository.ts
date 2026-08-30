import { ConversationDetailInfo, ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export interface ConversationRepository {
  getConsumerConversations(): Promise<ConsumerConversationContact[]>;
  getProviderConversations(): Promise<ProviderConversationContact[]>;
  getById(id: string): Promise<ConversationDetailInfo>;
  create(data: { counterpart_id: number; content?: string; image_file_ids?: string[] }): Promise<{ id: number }>;
  sendMessage(conversationId: string, content?: string, imageFileIds?: string[]): Promise<unknown>;
}
