import { AiConversationContact, AiConversationDetail } from "@/domain/messaging/types";

export interface AiChatRepository {
  getConversations(): Promise<AiConversationContact[]>;
  getById(id: string): Promise<AiConversationDetail>;
  create(content: string): Promise<AiConversationDetail>;
  sendMessage(conversationId: string, content: string): Promise<AiConversationDetail>;
}
