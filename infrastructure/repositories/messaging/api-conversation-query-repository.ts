import { api } from "@/infrastructure/api/base-client";
import { ApiConversation, ApiConversationDetail } from "@/infrastructure/api/types";
import {
  ConversationDetailInfo,
  ConsumerConversationContact,
  ProviderConversationContact,
} from "@/domain/messaging/types";
import { ConversationQueryRepository } from "@/ports/messaging/conversation-query-repository";
import {
  transformApiToConsumerContact,
  transformApiToProviderContact,
  transformApiToConversationDetail,
} from "./conversation-mapper";

export class ApiConversationQueryRepository implements ConversationQueryRepository {
  async getConsumerConversations(): Promise<ConsumerConversationContact[]> {
    const data = await api.get<ApiConversation[]>("/conversations");
    return data.map(transformApiToConsumerContact);
  }

  async getProviderConversations(): Promise<ProviderConversationContact[]> {
    const data = await api.get<ApiConversation[]>("/conversations");
    return data.map(transformApiToProviderContact);
  }

  async getById(id: string): Promise<ConversationDetailInfo> {
    const data = await api.get<ApiConversationDetail>(`/conversations/${id}`);
    return transformApiToConversationDetail(data);
  }
}
