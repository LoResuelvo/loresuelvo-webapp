import type { ApiAiConversation, ApiAiConversationDetail, ApiAiConversationMessage, ApiRecommendedProvider } from "@/infrastructure/api/types";
import type { AiConversationContact, AiConversationDetail, AiMessage, RecommendedProvider } from "@/domain/messaging/types";

export function mapApiToAiConversationContact(api: ApiAiConversation): AiConversationContact {
  return {
    id: String(api.id),
    title: api.title,
    lastMessage: api.last_message?.content ?? "",
    lastMessageAt: api.last_message?.created_on ?? api.updated_on,
  };
}

export function mapApiToAiMessage(api: ApiAiConversationMessage): AiMessage {
  return {
    id: String(api.id),
    senderRole: api.sender_role as "consumer" | "chatbot",
    content: api.content,
    sentAt: api.created_on,
  };
}

export function mapApiToRecommendedProvider(api: ApiRecommendedProvider): RecommendedProvider {
  return {
    id: api.id,
    name: api.name,
    surname: api.surname,
    categoryName: api.category_name,
    profilePhotoUrl: api.profile_photo_url,
  };
}

export function mapApiToAiConversationDetail(api: ApiAiConversationDetail): AiConversationDetail {
  const providers = api.recommended_providers ?? api.chatbot?.recommended_providers ?? [];
  const title = api.title ?? api.chatbot?.title ?? "";
  const responseStatus = api.response_status ?? api.chatbot?.response_status ?? "";

  return {
    id: api.id,
    status: api.status,
    title: title,
    responseStatus: responseStatus,
    messages: api.messages.map(mapApiToAiMessage),
    recommendedProviders: providers.map(mapApiToRecommendedProvider),
    updatedOn: api.messages.length > 0
      ? api.messages[api.messages.length - 1].created_on
      : new Date().toISOString(),
  };
}
