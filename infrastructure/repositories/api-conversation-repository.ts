import { api } from "@/infrastructure/api/base-client";
import { ApiConversation } from "@/infrastructure/api/types";
import { ConversationDetail } from "@/domain/messaging/types";
import { ConversationRepository } from "@/ports/conversation-repository";

export class ApiConversationRepository implements ConversationRepository {
  async getAll(): Promise<ApiConversation[]> {
    return api.get<ApiConversation[]>("/conversations");
  }

  async getById(id: string): Promise<ConversationDetail> {
    return api.get<ConversationDetail>(`/conversations/${id}`);
  }

  async create(data: { counterpart_id: number; content: string }): Promise<ApiConversation> {
    return api.post<ApiConversation>("/conversations", data);
  }

  async sendMessage(conversationId: string, content: string): Promise<unknown> {
    return api.post(`/conversations/${conversationId}/messages`, { content });
  }
}
