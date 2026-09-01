import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import {
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/infrastructure/repositories/consumer/mock-assistant-client";
import type { AiMessage } from "@/domain/diagnosis/types";
import { useClock } from "@/hooks/useClock";
import { t } from "@/infrastructure/i18n/translations";
import { executeAiDiagnosisTransport } from "./ai-diagnosis-transport";
import type { AiMessageAttempt } from "./ai-message-attempt";

export type { AiMessageAttempt };

export type AiReplyRequestState =
  | { status: "idle" }
  | { status: "pending"; attempt: AiMessageAttempt }
  | { status: "failed"; attempt: AiMessageAttempt; error: string };

export interface UseAiReplyRequestControllerProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  effectiveConversationId?: string | null;
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
}

export function useAiReplyRequestController({
  client,
  chatRepository,
  simulateError = false,
  effectiveConversationId,
  setMessages,
}: UseAiReplyRequestControllerProps) {
  const router = useRouter();
  const { now } = useClock();
  const isMountedRef = useRef(true);
  const isExecutingRef = useRef(false);
  const activeRequestIdRef = useRef(0);

  const [requestState, setRequestState] = useState<AiReplyRequestState>({
    status: "idle",
  });
  const requestStateRef = useRef<AiReplyRequestState>(requestState);
  requestStateRef.current = requestState;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isExecutingRef.current = false;
      activeRequestIdRef.current += 1;
    };
  }, []);

  const assistantClient = useMemo(
    () => client ?? createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS, { simulateError }),
    [client, simulateError]
  );

  const executeAttempt = useCallback(
    async (attempt: AiMessageAttempt, requestId: number) => {
      try {
        const result = await executeAiDiagnosisTransport({
          attempt,
          effectiveConversationId,
          chatRepository,
          assistantClient,
          nowIso: now().toISOString(),
        });

        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) return;

        if (result.append) {
          setMessages((prev) => [...prev, ...result.messages]);
        } else {
          setMessages(result.messages);
        }

        if (result.action?.type === "refresh") {
          router.refresh();
        } else if (result.action?.type === "push") {
          router.push(result.action.url);
        }

        isExecutingRef.current = false;
        requestStateRef.current = { status: "idle" };
        setRequestState({ status: "idle" });
      } catch {
        if (!isMountedRef.current || activeRequestIdRef.current !== requestId) return;
        isExecutingRef.current = false;
        const failed: AiReplyRequestState = { status: "failed", attempt, error: t.aiDiagnosis.errors.noResponse };
        requestStateRef.current = failed;
        setRequestState(failed);
      }
    },
    [effectiveConversationId, chatRepository, assistantClient, setMessages, router, now]
  );

  const tryExecuteAttempt = useCallback(
    (attempt: AiMessageAttempt, onAcquired?: () => void): boolean => {
      if (isExecutingRef.current || requestStateRef.current.status === "pending") return false;

      isExecutingRef.current = true;
      const pending: AiReplyRequestState = { status: "pending", attempt };
      requestStateRef.current = pending;
      setRequestState(pending);

      onAcquired?.();

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      void executeAttempt(attempt, requestId);
      return true;
    },
    [executeAttempt]
  );

  const retry = useCallback(async () => {
    if (requestStateRef.current.status !== "failed") return;
    tryExecuteAttempt(requestStateRef.current.attempt);
  }, [tryExecuteAttempt]);

  return {
    isWaitingForReply: requestState.status === "pending",
    chatError: requestState.status === "failed" ? requestState.error : null,
    tryExecuteAttempt,
    retry,
  };
}
