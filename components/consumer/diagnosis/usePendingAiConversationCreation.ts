import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiMessage } from "@/domain/diagnosis/types";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { useClock } from "@/hooks/useClock";
import { logger } from "@/infrastructure/logging/logger";
import { t } from "@/infrastructure/i18n/translations";
import { USER_ID } from "./ai-conversation-mapper";

export interface UsePendingAiConversationCreationProps {
  effectiveConversationId?: string | null;
  chatRepository?: AiChatRepository;
}

export function usePendingAiConversationCreation({
  effectiveConversationId,
  chatRepository,
}: UsePendingAiConversationCreationProps) {
  const router = useRouter();
  const { now } = useClock();

  const pendingAttemptRef = useRef<{ text: string; imageIds: string[] } | null>(null);
  const isCreatingRef = useRef(false);

  const [initialPendingMessages] = useState<AiMessage[]>(() => {
    if (typeof window === "undefined" || Boolean(effectiveConversationId)) return [];
    const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
    if (!pendingRaw) return [];
    try {
      const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
      pendingAttemptRef.current = pending;
      return [
        {
          id: `temp-${Date.now()}`,
          content: pending.text,
          senderId: USER_ID,
          sentAt: formatToLocalShortDateTime(now().toISOString()),
        },
      ];
    } catch {
      return [];
    }
  });

  const [isCreatingPending, setIsCreatingPending] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const executeCreation = useCallback(
    async (attempt: { text: string; imageIds: string[] }) => {
      if (!chatRepository) return;
      isCreatingRef.current = true;
      setIsCreatingPending(true);
      setCreationError(null);

      try {
        const conversation = await chatRepository.create(
          attempt.text,
          attempt.imageIds.length > 0 ? attempt.imageIds : undefined
        );
        pendingAttemptRef.current = null;
        setIsCreatingPending(false);
        router.replace(`${ROUTES.consumer.aiMessages}?id=${conversation.id}`);
      } catch (err) {
        logger.debug("Failed to create conversation from pending message:", { err });
        setIsCreatingPending(false);
        setCreationError(t.aiDiagnosis.errors.noResponse);
      } finally {
        isCreatingRef.current = false;
      }
    },
    [chatRepository, router]
  );

  useEffect(() => {
    if (effectiveConversationId || typeof window === "undefined") return;

    const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
    if (pendingRaw) {
      window.sessionStorage.removeItem("pendingAiMessage");
      try {
        const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
        pendingAttemptRef.current = pending;
        void executeCreation(pending);
      } catch {
        // ignore parse error
      }
    }
  }, [effectiveConversationId, executeCreation]);

  const retryPendingCreation = useCallback(async () => {
    if (isCreatingRef.current || !pendingAttemptRef.current || !chatRepository) return;
    await executeCreation(pendingAttemptRef.current);
  }, [chatRepository, executeCreation]);

  return {
    initialPendingMessages,
    isCreatingPending,
    creationError,
    retryPendingCreation,
    hasPendingCreation: Boolean(pendingAttemptRef.current),
  };
}
