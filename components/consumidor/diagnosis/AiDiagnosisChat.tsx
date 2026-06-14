"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import MessageBubble from "@/app/components/messaging/MessageBubble";
import MessageInput from "@/app/components/messaging/MessageInput";
import {
  AssistantClient,
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/lib/diagnosis/assistant-client";

interface ChatMessage {
  id: string;
  content: string;
  sentAt: string;
  senderId: string;
}

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";

const ERROR_MESSAGE = "No pudimos obtener una respuesta en este momento";

interface AiDiagnosisChatProps {
  client?: AssistantClient;
  simulateError?: boolean;
}

export default function AiDiagnosisChat({ client, simulateError = false }: AiDiagnosisChatProps = {}) {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("mensaje")?.trim() ?? "";
  const urlSimulateError = searchParams.get("simulate") === "error";
  const shouldSimulateError = simulateError || urlSimulateError;

  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const assistantClient = useMemo(
    () =>
      client ??
      createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS, {
        simulateError: shouldSimulateError,
      }),
    [client, shouldSimulateError],
  );

  useEffect(() => {
    if (!initialMessage) {
      setAssistantReply(null);
      setHasError(false);
      return;
    }
    setAssistantReply(null);
    setHasError(false);
    let cancelled = false;
    assistantClient
      .requestReply(initialMessage)
      .then((reply) => {
        if (cancelled) return;
        setAssistantReply(reply);
        setHasError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantReply(null);
        setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialMessage, assistantClient, retryToken]);

  const handleRetry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  if (!initialMessage) {
    return null;
  }

  const isProcessing = assistantReply === null && !hasError;

  const messages: ChatMessage[] = [
    {
      id: "msg-user-1",
      content: initialMessage,
      sentAt: "Recién",
      senderId: USER_ID,
    },
  ];

  if (assistantReply) {
    messages.push({
      id: "msg-assistant-1",
      content: assistantReply,
      sentAt: "Recién",
      senderId: ASSISTANT_ID,
    });
  }

  return (
    <section
      aria-label="Chat con el asistente de diagnóstico"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col"
    >
      <div className="flex flex-col gap-4 p-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            id={msg.id}
            content={msg.content}
            sentAt={msg.sentAt}
            isExpanded={false}
            showExpandButton={false}
            onToggleExpand={() => undefined}
            isOwnMessage={msg.senderId === USER_ID}
          />
        ))}

        {isProcessing && (
          <div
            role="status"
            aria-label="Asistente escribiendo"
            className="flex justify-start"
          >
            <div className="rounded-2xl bg-white border border-slate-200 rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="text-[13px]">Asistente escribiendo…</span>
            </div>
          </div>
        )}

        {hasError && (
          <div
            role="alert"
            className="flex justify-start"
          >
            <div className="rounded-2xl bg-red-50 border border-red-200 rounded-tl-sm px-4 py-3 flex flex-col gap-2 max-w-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-[14px] font-medium">{ERROR_MESSAGE}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="self-start text-[13px] font-semibold text-red-700 hover:text-red-900 underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200">
        <MessageInput
          value=""
          onChange={() => undefined}
          onSend={() => undefined}
          disabled={isProcessing}
        />
      </div>
    </section>
  );
}
