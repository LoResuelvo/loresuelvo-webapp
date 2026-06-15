"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, MessageSquare, Send } from "lucide-react";
import MessageBubble from "@/components/messaging/MessageBubble";
import InfoBanner from "@/components/messaging/InfoBanner";
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

const MAX_LINES = 6;
const INITIAL_HEIGHT = 50;
const LINE_HEIGHT_CSS = 24;

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
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || isSending) return;
    setIsSending(true);
    setMessageInput("");
    setIsSending(false);
  }, [messageInput, isSending]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (!messageInput || !messageInput.trim()) {
      textarea.rows = 2;
      textarea.style.height = `${INITIAL_HEIGHT}px`;
      textarea.style.overflowY = "hidden";
      return;
    }
    const lineCount = messageInput.split("\n").length;
    const effectiveLines = Math.min(Math.max(lineCount, 1), MAX_LINES);
    textarea.rows = effectiveLines;
    const maxHeight = LINE_HEIGHT_CSS * MAX_LINES;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = lineCount > MAX_LINES ? "auto" : "hidden";
  }, [messageInput]);

  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);
    adjustHeight();
  }, [adjustHeight]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const setTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (node) {
      node.rows = 2;
      node.style.height = `${INITIAL_HEIGHT}px`;
      node.style.overflowY = "hidden";
    }
  }, []);

  const isProcessing = Boolean(initialMessage) && assistantReply === null && !hasError;

  const messages: ChatMessage[] = initialMessage
    ? [
        {
          id: "msg-user-1",
          content: initialMessage,
          sentAt: "Recién",
          senderId: USER_ID,
        },
      ]
    : [];

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
      <div className="px-6 pt-6">
        <InfoBanner tone="info">
          Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo
        </InfoBanner>
      </div>
      <div className="flex flex-col gap-4 p-6 min-h-[280px]">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-4" aria-hidden="true" />
              <h1 className="text-[22px] font-bold text-brand-primary">
                Chat con IA
              </h1>
              <p className="mt-2 text-[14px] text-slate-500">
                Describe el problema de tu hogar para iniciar una conversación con el asistente.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
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
          ))
        )}

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

      <div className="border-t border-slate-200 p-4 flex gap-3 bg-white">
        <textarea
          ref={setTextareaRef}
          value={messageInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Escribe un mensaje..."
          className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] leading-6 focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
          disabled={isProcessing || isSending}
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isProcessing || isSending || !messageInput.trim()}
          aria-label="Enviar mensaje"
          className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
