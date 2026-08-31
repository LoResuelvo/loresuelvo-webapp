import {
  ConversationDetailInfo,
  ConsumerConversationContact,
  ProviderConversationContact,
} from "@/domain/messaging/types";

export interface ConversationQueryRepository {
  getConsumerConversations(): Promise<ConsumerConversationContact[]>;
  getProviderConversations(): Promise<ProviderConversationContact[]>;
  getById(id: string): Promise<ConversationDetailInfo>;
}
