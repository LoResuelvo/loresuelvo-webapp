import type { AiConversationDetail } from "@/domain/messaging/types";
import type { AiMessage } from "@/domain/diagnosis/types";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";

export const USER_ID = "consumer-ai-diagnosis";
export const ASSISTANT_ID = "assistant-ai-diagnosis";

export function mapConversationDetailToVisibleMessages(
  detail: AiConversationDetail
): AiMessage[] {
  if (!detail.messages || detail.messages.length === 0) {
    return [];
  }

  const lastAssistantIndex = detail.messages.findLastIndex(
    (m) => m.senderRole === "chatbot"
  );

  return detail.messages.map((msg, index) => ({
    id: msg.id,
    content: msg.content,
    senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
    sentAt: formatToLocalShortDateTime(msg.sentAt),
    images: msg.images,
    recommendedProviders:
      index === lastAssistantIndex ? detail.recommendedProviders : undefined,
    diagnosisCompleted:
      index === lastAssistantIndex ? detail.diagnosisCompleted : undefined,
    assessment: index === lastAssistantIndex ? detail.assessment : undefined,
  }));
}
