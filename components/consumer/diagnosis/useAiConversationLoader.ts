import { useState, useEffect, useRef, useCallback, type SetStateAction } from "react";
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

  const [messages, setMessagesState] = useState<AiMessage[]>(pending.initialPendingMessages);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchedConversationId = useRef<string | null>(null);
  const loadRequestId = useRef(0);
  const messageUpdateId = useRef(0);

  const setMessages = useCallback(
    (update: SetStateAction<AiMessage[]>) => {
      messageUpdateId.current += 1;
      setMessagesState(update);
    },
    []
  );

  useEffect(() => {
    if (!effectiveConversationId) {
      loadRequestId.current += 1;
      if (!pending.hasPendingCreation) {
        setMessagesState((prev) => (prev.length === 0 ? prev : []));
      }
      fetchedConversationId.current = null;
      setIsLoadingMessages(false);
      setIsInitialized(true);
      return;
    }

    if (
      chatRepository &&
      fetchedConversationId.current !== effectiveConversationId
    ) {
      fetchedConversationId.current = effectiveConversationId;
      const requestId = ++loadRequestId.current;
      const messageUpdateAtRequest = messageUpdateId.current;
      setIsLoadingMessages(true);
      chatRepository
        .getById(effectiveConversationId)
        .then((data) => {
          if (
            requestId !== loadRequestId.current ||
            fetchedConversationId.current !== effectiveConversationId ||
            messageUpdateAtRequest !== messageUpdateId.current
          ) {
            return;
          }
          setMessagesState(mapConversationDetailToVisibleMessages(data));
        })
        .catch((error) => {
          if (requestId === loadRequestId.current) {
            console.error(error);
          }
        })
        .finally(() => {
          if (requestId === loadRequestId.current) {
            setIsLoadingMessages(false);
          }
        });
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
