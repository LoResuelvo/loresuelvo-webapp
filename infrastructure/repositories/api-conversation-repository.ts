import { api } from "@/infrastructure/api/base-client";
import { ApiConversation } from "@/infrastructure/api/types";
import { ConversationDetail, ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";
import { ConversationRepository } from "@/ports/conversation-repository";
import { transformApiToConsumerContact, transformApiToProviderContact } from "./conversation-mapper";

export class ApiConversationRepository implements ConversationRepository {
  async getConsumerConversations(): Promise<ConsumerConversationContact[]> {
    const data = await api.get<ApiConversation[]>("/conversations");
    return data.map(transformApiToConsumerContact);
  }

  async getProviderConversations(): Promise<ProviderConversationContact[]> {
    const data = await api.get<ApiConversation[]>("/conversations");
    return data.map(transformApiToProviderContact);
  }

  async getById(id: string): Promise<ConversationDetail> {
    return api.get<ConversationDetail>(`/conversations/${id}`);
  }

  async create(data: { counterpart_id: number; content: string }): Promise<{ id: number }> {
    const res = await api.post<ApiConversation>("/conversations", data);
    return { id: res.id };
  }

  async sendMessage(conversationId: string, content: string): Promise<unknown> {
    return api.post(`/conversations/${conversationId}/messages`, { content });
  }
}
