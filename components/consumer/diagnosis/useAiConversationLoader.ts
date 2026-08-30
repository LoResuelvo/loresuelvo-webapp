import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { useClock } from "@/hooks/useClock";
import { logger } from "@/infrastructure/logging/logger";
import { t } from "@/infrastructure/i18n/translations";

export const USER_ID = "consumer-ai-diagnosis";
export const ASSISTANT_ID = "assistant-ai-diagnosis";

export interface UseAiConversationLoaderProps {
  conversationId?: string | null;
  chatRepository?: AiChatRepository;
  onCreationError?: (error: string) => void;
  setIsWaitingForReply?: (waiting: boolean) => void;
}

export function useAiConversationLoader({
  conversationId,
  chatRepository,
  onCreationError,
  setIsWaitingForReply,
}: UseAiConversationLoaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { now } = useClock();
  const effectiveConversationId = conversationId ?? searchParams.get("id");

  const routerRef = useRef(router);
  routerRef.current = router;

  const onCreationErrorRef = useRef(onCreationError);
  onCreationErrorRef.current = onCreationError;

  const setIsWaitingForReplyRef = useRef(setIsWaitingForReply);
  setIsWaitingForReplyRef.current = setIsWaitingForReply;

  const [messages, setMessages] = useState<AiMessage[]>(() => {
    if (typeof window === "undefined") return [];
    const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
    if (!pendingRaw) return [];
    const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
    return [
      {
        id: `temp-${Date.now()}`,
        content: pending.text,
        senderId: USER_ID,
        sentAt: formatToLocalShortDateTime(now().toISOString()),
      },
    ];
  });

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchedConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (!effectiveConversationId && typeof window !== "undefined") {
      const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
        window.sessionStorage.removeItem("pendingAiMessage");

        setIsWaitingForReplyRef.current?.(true);
        setIsInitialized(true);

        if (chatRepository) {
          chatRepository
            .create(pending.text, pending.imageIds.length > 0 ? pending.imageIds : undefined)
            .then((conversation) => {
              routerRef.current.replace(`${ROUTES.consumer.aiMessages}?id=${conversation.id}`);
            })
            .catch((err) => {
              logger.debug("Failed to create conversation:", { err });
              onCreationErrorRef.current?.(t.aiDiagnosis.errors.noResponse);
              setIsWaitingForReplyRef.current?.(false);
            });
        }
        return;
      }

      if (messages.length > 0) return;
    }

    if (!effectiveConversationId) {
      setMessages((prev) => (prev.length === 0 ? prev : []));
      fetchedConversationId.current = null;
      setIsInitialized(true);
      return;
    }

    if (
      effectiveConversationId &&
      chatRepository &&
      fetchedConversationId.current !== effectiveConversationId
    ) {
      fetchedConversationId.current = effectiveConversationId;
      setIsLoadingMessages(true);
      chatRepository
        .getById(effectiveConversationId)
        .then((data) => {
          const lastAssistantIndex = data.messages.findLastIndex((m) => m.senderRole === "chatbot");
          const msgs = data.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders:
              index === lastAssistantIndex ? data.recommendedProviders : undefined,
            diagnosisCompleted:
              index === lastAssistantIndex ? data.diagnosisCompleted : undefined,
            assessment: index === lastAssistantIndex ? data.assessment : undefined,
          }));
          setMessages(msgs);
        })
        .catch(console.error)
        .finally(() => setIsLoadingMessages(false));
    }
    setIsInitialized(true);
  }, [effectiveConversationId, chatRepository, messages.length]);

  return {
    effectiveConversationId,
    messages,
    setMessages,
    isLoadingMessages,
    isInitialized,
    setIsInitialized,
    fetchedConversationId,
  };
}
