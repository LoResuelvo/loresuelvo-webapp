import { api } from "@/lib/api/base-client";
import type { ApiConversation } from "@/lib/api/types";

export type { ApiConversation };

export interface SendMessagePayload {
  content: string;
}

class ConversationsClient {
  async getConversations(): Promise<ApiConversation[]> {
    return api.get<ApiConversation[]>("/conversations");
  }

  async getConversation(id: string): Promise<ApiConversation> {
    return api.get<ApiConversation>(`/conversations/${id}`);
  }

  async createConversation(data: { content: string; counterpart_id: number }): Promise<ApiConversation> {
    return api.post<ApiConversation>("/conversations", data);
  }

  async sendMessage(conversationId: string, data: SendMessagePayload): Promise<unknown> {
    return api.post(`/conversations/${conversationId}/messages`, data);
  }
}

export const conversationsClient = new ConversationsClient();