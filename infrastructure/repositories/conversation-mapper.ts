import { ApiConversation } from "@/infrastructure/api/types";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

export function transformApiToConsumerContact(apiConv: ApiConversation): ConsumerConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    providerId: String(apiConv.counterpart.id),
    providerName: apiConv.counterpart.name,
    providerSurname: apiConv.counterpart.surname,
    lastMessage: apiConv.last_message?.content || "",
    lastMessageAt: apiConv.last_message?.created_on
      ? new Date(apiConv.last_message.created_on).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    pending: apiConv.status === "pending",
    profilePhotoUrl: apiConv.counterpart.profile_photo_url,
  };
}

export function transformApiToProviderContact(apiConv: ApiConversation): ProviderConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    consumerId: String(apiConv.counterpart.id),
    consumerName: apiConv.counterpart.name,
    consumerSurname: apiConv.counterpart.surname,
    lastMessage: apiConv.last_message?.content || "",
    lastMessageAt: apiConv.last_message?.created_on
      ? new Date(apiConv.last_message.created_on).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    pending: apiConv.status === "pending",
    profilePhotoUrl: apiConv.counterpart.profile_photo_url,
  };
}

import { ApiConversationDetail } from "@/infrastructure/api/types";
import { ConversationDetailInfo, Message } from "@/domain/messaging/types";

export function transformApiToConversationDetail(api: ApiConversationDetail): ConversationDetailInfo {
  return {
    id: api.id,
    status: api.status,
    counterpart: {
      id: api.counterpart.id,
      role: api.counterpart.role,
      name: api.counterpart.name,
      surname: api.counterpart.surname,
      categoryName: api.counterpart.category_name,
      profilePhotoUrl: api.counterpart.profile_photo_url,
    },
    messages: api.messages.map((m) => ({
      id: String(m.id),
      content: m.content,
      senderId: m.sender_role,
      sentAt: new Date(m.created_on).toLocaleString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    updatedOn: api.updated_on,
  };
}
