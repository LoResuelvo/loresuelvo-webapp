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
  };
}
