import type { ApiAiConversation, ApiAiConversationDetail, ApiAiConversationMessage } from "@/infrastructure/api/types";
import type { AiConversationContact, AiConversationDetail, AiMessage } from "@/domain/messaging/types";

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

export function mapApiToAiConversationDetail(api: ApiAiConversationDetail): AiConversationDetail {
  return {
    id: api.id,
    status: api.status,
    title: api.title,
    responseStatus: api.response_status,
    messages: api.messages.map(mapApiToAiMessage),
    updatedOn: api.messages.length > 0
      ? api.messages[api.messages.length - 1].created_on
      : new Date().toISOString(),
  };
}
