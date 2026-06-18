import { api } from "@/infrastructure/api/base-client";
import type { ApiAiConversation, ApiAiConversationDetail } from "@/infrastructure/api/types";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import { AiConversationContact, AiConversationDetail } from "@/domain/messaging/types";
import { mapApiToAiConversationContact, mapApiToAiConversationDetail } from "./ai-chat-mapper";

export class ApiAiChatRepository implements AiChatRepository {
  async getConversations(): Promise<AiConversationContact[]> {
    const data = await api.get<ApiAiConversation[]>("/chatbot/conversations");
    return data.map(mapApiToAiConversationContact);
  }

  async getById(id: string): Promise<AiConversationDetail> {
    const data = await api.get<ApiAiConversationDetail>(`/chatbot/conversations/${id}`);
    return mapApiToAiConversationDetail(data);
  }

  async create(content: string): Promise<AiConversationDetail> {
    const data = await api.post<ApiAiConversationDetail>("/chatbot/conversations", { content });
    return mapApiToAiConversationDetail(data);
  }

  async sendMessage(conversationId: string, content: string): Promise<AiConversationDetail> {
    const data = await api.post<ApiAiConversationDetail>(
      `/chatbot/conversations/${conversationId}/messages`,
      { content }
    );
    return mapApiToAiConversationDetail(data);
  }
}
