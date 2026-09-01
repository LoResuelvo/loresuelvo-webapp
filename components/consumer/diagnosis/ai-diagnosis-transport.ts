import { ROUTES } from "@/lib/routes";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiMessage } from "@/domain/diagnosis/types";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import {
  mapConversationDetailToVisibleMessages,
  ASSISTANT_ID,
} from "./ai-conversation-mapper";
import type { AiMessageAttempt } from "./ai-message-attempt";

export type AiTransportResult = {
  messages: AiMessage[];
  action?: { type: "refresh" } | { type: "push"; url: string };
  append?: boolean;
};

export interface ExecuteAiTransportOptions {
  attempt: AiMessageAttempt;
  effectiveConversationId?: string | null;
  chatRepository?: AiChatRepository;
  assistantClient: AssistantClient;
  nowIso: string;
}

export async function executeAiDiagnosisTransport({
  attempt,
  effectiveConversationId,
  chatRepository,
  assistantClient,
  nowIso,
}: ExecuteAiTransportOptions): Promise<AiTransportResult> {
  const imageIds = attempt.imageFileIds.length > 0 ? [...attempt.imageFileIds] : undefined;

  if (effectiveConversationId && chatRepository) {
    const updated = await chatRepository.sendMessage(effectiveConversationId, attempt.content, imageIds);
    return {
      messages: mapConversationDetailToVisibleMessages(updated),
      action: { type: "refresh" },
    };
  }

  if (chatRepository) {
    const created = await chatRepository.create(attempt.content, imageIds);
    return {
      messages: mapConversationDetailToVisibleMessages(created),
      action: { type: "push", url: `${ROUTES.consumer.aiMessages}?id=${created.id}` },
    };
  }

  const reply = await assistantClient.requestReply(attempt.content);
  return {
    messages: [
      {
        id: `msg-assistant-${Date.now()}`,
        content: reply,
        senderId: ASSISTANT_ID,
        sentAt: formatToLocalShortDateTime(nowIso),
      },
    ],
    append: true,
  };
}
