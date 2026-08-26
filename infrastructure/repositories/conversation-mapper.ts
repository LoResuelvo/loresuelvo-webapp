import { ApiConversation, ApiConversationDetail, ApiConversationMessage } from "@/infrastructure/api/types";
import { ConsumerConversationContact, ProviderConversationContact, ConversationDetailInfo, Message } from "@/domain/messaging/types";
import { formatMessagePreview } from "@/lib/message-preview";
import { formatConversationLastMessageDate } from "@/lib/date-utils";

export function formatToLocalShortDateTime(dateString: string | Date): string {
  return formatConversationLastMessageDate(dateString);
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
      id: String(img.id),
      url: img.url,
      originalName: (img as any).originalName || img.original_name,
    })) : undefined,
    audio: apiMsg.audio ? {
      id: String(apiMsg.audio.id),
      url: apiMsg.audio.url,
      originalName: apiMsg.audio.original_name,
      durationSeconds: apiMsg.audio.duration_seconds,
      mimeType: apiMsg.audio.mime_type,
      sizeBytes: apiMsg.audio.size_bytes,
    } : undefined,
    sentAt: formatToLocalTime(apiMsg.created_on),
    createdOn: apiMsg.created_on,
  };
}

export function transformApiToConsumerContact(apiConv: ApiConversation): ConsumerConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    providerId: String(apiConv.counterpart.id),
    providerName: apiConv.counterpart.name,
    providerSurname: apiConv.counterpart.surname,
    lastMessage: formatMessagePreview(apiConv.last_message),
    lastMessageAt: formatConversationLastMessageDate(apiConv.last_message?.created_on),
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
    lastMessage: formatMessagePreview(apiConv.last_message),
    lastMessageAt: formatConversationLastMessageDate(apiConv.last_message?.created_on),
    pending: apiConv.status === "pending",
    profilePhotoUrl: apiConv.counterpart.profile_photo_url,
  };
}

export function transformApiToConversationDetail(api: ApiConversationDetail): ConversationDetailInfo {
  const counterpart = api.counterpart || api.work?.counterpart || {
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
      id: Number(counterpart.id) || 0,
      role: counterpart.role,
      name: counterpart.name,
      surname: counterpart.surname,
      categoryName: counterpart.category_name || "",
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
      audio: m.audio ? {
        id: String(m.audio.id),
        url: m.audio.url,
        originalName: m.audio.original_name,
        durationSeconds: m.audio.duration_seconds,
        mimeType: m.audio.mime_type,
        sizeBytes: m.audio.size_bytes,
      } : undefined,
      sentAt: formatToLocalTime(m.created_on),
      createdOn: m.created_on,
    })) : [],
    updatedOn: api.updated_on,
  };
}
