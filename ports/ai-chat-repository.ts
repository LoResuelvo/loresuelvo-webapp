import { AiConversationContact, AiConversationDetail, AiJobRequestResult } from "@/domain/messaging/types";

export interface AiChatRepository {
  getConversations(): Promise<AiConversationContact[]>;
  getById(id: string): Promise<AiConversationDetail>;
  create(content: string, imageFileIds?: string[]): Promise<AiConversationDetail>;
  sendMessage(conversationId: string, content: string, imageFileIds?: string[]): Promise<AiConversationDetail>;
  createJobRequest(conversationId: string, providerId: number): Promise<AiJobRequestResult>;
}
