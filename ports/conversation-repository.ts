import { ApiConversation } from "@/infrastructure/api/types";
import { ConversationDetail } from "@/domain/messaging/types";

export interface ConversationRepository {
  getAll(): Promise<ApiConversation[]>;
  getById(id: string): Promise<ConversationDetail>;
  create(data: { counterpart_id: number; content: string }): Promise<ApiConversation>;
  sendMessage(conversationId: string, content: string): Promise<unknown>;
}
