"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AlertCircle, Loader2, MessageSquare, Send } from "lucide-react";
import MessageBubble from "@/components/messaging/MessageBubble";
import InfoBanner from "@/components/messaging/InfoBanner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantClient } from "@/ports/assistant-client";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import {
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/infrastructure/repositories/mock-assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import type { RecommendedProvider } from "@/domain/messaging/types";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { t } from "@/infrastructure/i18n/translations";

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";

const ERROR_MESSAGE = "No pudimos obtener una respuesta en este momento";

const MAX_LINES = 6;
const INITIAL_HEIGHT = 50;
const LINE_HEIGHT_CSS = 24;

interface AiDiagnosisChatProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  conversationId?: string | null;
}

export default function AiDiagnosisChat({ client, chatRepository, simulateError = false, conversationId }: AiDiagnosisChatProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSimulateError = searchParams.get("simulate") === "error";
  const shouldSimulateError = simulateError || urlSimulateError;
  const effectiveConversationId = conversationId ?? searchParams.get("id");

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [recommendedProviders, setRecommendedProviders] = useState<RecommendedProvider[]>([]);
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fetchedConversationId = useRef<string | null>(null);

  const assistantClient = useMemo(
    () =>
      client ??
      createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS, {
        simulateError: shouldSimulateError,
      }),
    [client, shouldSimulateError],
  );

  useEffect(() => {
    if (effectiveConversationId && chatRepository && fetchedConversationId.current !== effectiveConversationId) {
      fetchedConversationId.current = effectiveConversationId;
      chatRepository.getById(effectiveConversationId)
        .then((data) => {
          const msgs = data.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            }),
          }));
          setMessages(msgs);
          setRecommendedProviders(data.recommendedProviders || []);
        })
        .catch(console.error);
    }
    setIsInitialized(true);
  }, [effectiveConversationId, chatRepository]);

  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderId !== USER_ID) return;

    setLastUserMessage(lastMessage.content);
    setIsWaitingForReply(true);
    setAssistantReply(null);
    setHasError(false);

    let cancelled = false;

    const sendMessageToApi = async () => {
      try {
        let reply: string;

        if (effectiveConversationId && chatRepository) {
          const updated = await chatRepository.sendMessage(effectiveConversationId, lastMessage.content);
          const newMessages = updated.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setMessages(newMessages);
          setRecommendedProviders(updated.recommendedProviders || []);
          reply = updated.messages[updated.messages.length - 1]?.content ?? "";
          router.refresh();
        } else if (chatRepository) {
          const created = await chatRepository.create(lastMessage.content);
          const newMessages = created.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setMessages(newMessages);
          setRecommendedProviders(created.recommendedProviders || []);
          reply = created.messages[created.messages.length - 1]?.content ?? "";
          router.push(`${ROUTES.consumer.aiMessages}?id=${created.id}`);
        } else {
          reply = await assistantClient.requestReply(lastMessage.content);
          const assistantMessage: AiMessage = {
            id: `msg-assistant-${Date.now()}`,
            content: reply,
            senderId: ASSISTANT_ID,
            sentAt: new Date().toLocaleString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        if (cancelled) return;
        setIsWaitingForReply(false);
        setAssistantReply(null);
        setHasError(false);
        setLastUserMessage(null);
      } catch {
        if (cancelled) return;
        setIsWaitingForReply(false);
        setAssistantReply(null);
        setHasError(true);
      }
    };

    sendMessageToApi();

    return () => {
      cancelled = true;
    };
  }, [messages, assistantClient, isInitialized, effectiveConversationId, chatRepository, router]);

  const handleRetry = useCallback(() => {
    if (!lastUserMessage) return;
    setHasError(false);
    setIsWaitingForReply(true);
  }, [lastUserMessage]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setMessageInput("");

    const newMessage: AiMessage = {
      id: `msg-user-${Date.now()}`,
      content: trimmed,
      senderId: USER_ID,
      sentAt: new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);

    setIsSending(false);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.rows = 2;
      textarea.style.height = `${INITIAL_HEIGHT}px`;
      textarea.style.overflowY = "hidden";
      textarea.focus();
    }
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

  useEffect(() => {
    if (!messageInput && textareaRef.current) {
      textareaRef.current.rows = 2;
      textareaRef.current.style.height = `${INITIAL_HEIGHT}px`;
      textareaRef.current.style.overflowY = "hidden";
    }
  }, [messageInput]);

  const setTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (node) {
      node.rows = 2;
      node.style.height = `${INITIAL_HEIGHT}px`;
      node.style.overflowY = "hidden";
    }
  }, []);

  const isProcessing = isWaitingForReply && assistantReply === null && !hasError;

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
        {!isInitialized ? null : messages.length === 0 ? (
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
              <Button
                variant="link"
                type="button"
                onClick={handleRetry}
                className="self-start text-[13px] font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 p-0 h-auto"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}

        {recommendedProviders.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-6">
            <RecommendedProvidersList providers={recommendedProviders} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-4 flex gap-3 bg-white">
        <Textarea
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
          className="flex-1 resize-none px-4 py-3 min-h-0 rounded-xl border-slate-200 bg-white text-[14px] leading-6 focus-visible:ring-brand-secondary/40"
          disabled={isProcessing || isSending}
        />
        <Button
          type="button"
          onClick={handleSendMessage}
          disabled={isProcessing || isSending || !messageInput.trim()}
          aria-label="Enviar mensaje"
          className="px-5 h-[auto] py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-semibold"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
