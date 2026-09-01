import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiMessage } from "@/domain/diagnosis/types";
import {
  mapConversationDetailToVisibleMessages,
  USER_ID,
  ASSISTANT_ID,
} from "./ai-conversation-mapper";
import { usePendingAiConversationCreation } from "./usePendingAiConversationCreation";

export { USER_ID, ASSISTANT_ID };

export interface UseAiConversationLoaderProps {
  conversationId?: string | null;
  chatRepository?: AiChatRepository;
}

export function useAiConversationLoader({
  conversationId,
  chatRepository,
}: UseAiConversationLoaderProps) {
  const searchParams = useSearchParams();
  const effectiveConversationId = conversationId ?? searchParams.get("id");

  const pending = usePendingAiConversationCreation({
    effectiveConversationId,
    chatRepository,
  });

  const [messages, setMessages] = useState<AiMessage[]>(pending.initialPendingMessages);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchedConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (!effectiveConversationId) {
      if (!pending.hasPendingCreation) {
        setMessages((prev) => (prev.length === 0 ? prev : []));
      }
      fetchedConversationId.current = null;
      setIsInitialized(true);
      return;
    }

    if (
      chatRepository &&
      fetchedConversationId.current !== effectiveConversationId
    ) {
      fetchedConversationId.current = effectiveConversationId;
      setIsLoadingMessages(true);
      chatRepository
        .getById(effectiveConversationId)
        .then((data) => {
          setMessages(mapConversationDetailToVisibleMessages(data));
        })
        .catch(console.error)
        .finally(() => setIsLoadingMessages(false));
    }
    setIsInitialized(true);
  }, [effectiveConversationId, chatRepository, pending.hasPendingCreation]);

  return {
    effectiveConversationId,
    messages,
    setMessages,
    isLoadingMessages,
    isCreatingPending: pending.isCreatingPending,
    creationError: pending.creationError,
    isInitialized,
    retryPendingCreation: pending.retryPendingCreation,
  };
}
