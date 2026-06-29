import { ApiConversation, ApiConversationDetail, ApiConversationMessage } from "@/infrastructure/api/types";
import { ConsumerConversationContact, ProviderConversationContact, ConversationDetailInfo, Message } from "@/domain/messaging/types";

export function formatToLocalShortDateTime(dateString: string | Date): string {
  return new Date(dateString).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatToLocalTime(dateString: string | Date): string {
  return new Date(dateString).toLocaleString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function transformApiMessageToDomain(
  apiMsg: ApiConversationMessage,
  myUserId: string,
  counterpartId: string,
  myRole: "consumer" | "provider"
): Message {
  const isOwn = apiMsg.sender_role === myRole;
  return {
    id: String(apiMsg.id),
    content: apiMsg.content,
    senderId: isOwn ? myUserId : counterpartId,
    images: apiMsg.images ? apiMsg.images.map(img => ({
      id: img.id,
      url: img.url,
      originalName: img.original_name,
    })) : undefined,
    sentAt: formatToLocalTime(apiMsg.created_on),
  };
}

export function transformApiToConsumerContact(apiConv: ApiConversation): ConsumerConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    providerId: String(apiConv.counterpart.id),
    providerName: apiConv.counterpart.name,
    providerSurname: apiConv.counterpart.surname,
    lastMessage: apiConv.last_message?.content || "",
    lastMessageAt: apiConv.last_message?.created_on
      ? formatToLocalShortDateTime(apiConv.last_message.created_on)
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
      ? formatToLocalShortDateTime(apiConv.last_message.created_on)
      : "",
    pending: apiConv.status === "pending",
    profilePhotoUrl: apiConv.counterpart.profile_photo_url,
  };
}

export function transformApiToConversationDetail(api: ApiConversationDetail): ConversationDetailInfo {
  const counterpart = api.work?.counterpart || {
    id: 0,
    role: "unknown",
    name: "Unknown",
    surname: "",
    category_name: "",
    profile_photo_url: undefined,
  };

  return {
    id: api.id,
    status: api.status,
    counterpart: {
      id: counterpart.id,
      role: counterpart.role,
      name: counterpart.name,
      surname: counterpart.surname,
      categoryName: counterpart.category_name,
      profilePhotoUrl: counterpart.profile_photo_url,
    },
    messages: api.messages ? api.messages.map((m) => ({
      id: String(m.id),
      content: m.content,
      senderId: m.sender_role,
      images: m.images ? m.images.map(img => ({
        id: img.id,
        url: img.url,
        originalName: img.original_name,
      })) : undefined,
      sentAt: formatToLocalTime(m.created_on),
    })) : [],
    updatedOn: api.updated_on,
  };
}

