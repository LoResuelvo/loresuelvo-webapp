"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AlertCircle, Loader2, MessageSquare, ChevronLeft, Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import MessageBubble from "@/components/messaging/MessageBubble";
import InfoBanner from "@/components/messaging/InfoBanner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePreviewModal } from "@/components/messaging/ImagePreviewModal";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";
import { AssistantClient } from "@/ports/assistant-client";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import {
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/infrastructure/repositories/mock-assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { t } from "@/infrastructure/i18n/translations";

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";



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
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const fetchedConversationId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadedImageIdsRef = useRef<string[]>([]);
  const uploadedImagesMapRef = useRef<{ fileName: string; fileId: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assistantClient = useMemo(
    () =>
      client ??
      createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS, {
        simulateError: shouldSimulateError,
      }),
    [client, shouldSimulateError],
  );

  useEffect(() => {
    if (!effectiveConversationId) {
      setMessages([]);
      setAssistantReply(null);
      setChatError(null);
      setIsWaitingForReply(false);
      setLastUserMessage(null);
      fetchedConversationId.current = null;
      setIsInitialized(true);
      return;
    }

    if (effectiveConversationId && chatRepository && fetchedConversationId.current !== effectiveConversationId) {
      fetchedConversationId.current = effectiveConversationId;
      chatRepository.getById(effectiveConversationId)
        .then((data) => {
          const lastAssistantIndex = data.messages.findLastIndex((m) => m.senderRole === "chatbot");
          const msgs = data.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            }),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? data.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? data.diagnosisCompleted : undefined,
          }));
          setMessages(msgs);
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
    setChatError(null);

    let cancelled = false;

    const sendMessageToApi = async () => {
      try {
        let reply: string;
        const imageIds = uploadedImageIdsRef.current;
        uploadedImageIdsRef.current = [];

        if (effectiveConversationId && chatRepository) {
          const updated = await chatRepository.sendMessage(effectiveConversationId, lastMessage.content, imageIds);
          const lastAssistantIndex = updated.messages.findLastIndex((m) => m.senderRole === "chatbot");
          const newMessages = updated.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            }),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? updated.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? updated.diagnosisCompleted : undefined,
          }));
          setMessages(newMessages);
          reply = updated.messages[updated.messages.length - 1]?.content ?? "";
          router.refresh();
        } else if (chatRepository) {
          const created = await chatRepository.create(lastMessage.content, imageIds);
          const lastAssistantIndex = created.messages.findLastIndex((m) => m.senderRole === "chatbot");
          const newMessages = created.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: new Date(msg.sentAt).toLocaleString("es-AR", {
              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
            }),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? created.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? created.diagnosisCompleted : undefined,
          }));
          setMessages(newMessages);
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
        setChatError(null);
        setLastUserMessage(null);
      } catch {
        if (cancelled) return;
        setIsWaitingForReply(false);
        setAssistantReply(null);
        setChatError("No pudimos obtener una respuesta en este momento");
      }
    };

    sendMessageToApi();

    return () => {
      cancelled = true;
    };
  }, [messages, assistantClient, isInitialized, effectiveConversationId, chatRepository, router]);

  const handleRetry = useCallback(() => {
    if (!lastUserMessage) return;
    setChatError(null);
    setIsWaitingForReply(true);
  }, [lastUserMessage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(t.messaging.fileTooLarge);
          return false;
        }
        
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setUploadError(t.messaging.photoInvalidFormat);
          return false;
        }
        
        return true;
      });

      if (validFiles.length > 0) {
        setUploadError(null);
        setChatError(null);
        setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5));

        for (const file of validFiles) {
          try {
            const presigned = await getPresignedUrlAction(file.name, file.type, file.size, "chatbot_message_image");
            const uploadRes = await fetch(presigned.upload_url, {
              method: "PUT",
              body: file,
              headers: presigned.headers,
            });
            if (!uploadRes.ok) throw new Error("Error al subir archivo a R2");
            const confirm = await confirmUploadAction(presigned.file_id, presigned.key, file.type, file.size);
            uploadedImagesMapRef.current.push({
              fileName: file.name,
              fileId: confirm.id
            });
          } catch (uploadErr) {
            console.error("Error al subir archivo inmediatamente:", uploadErr);
            setChatError("No se pudo cargar la imagen");
          }
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = useCallback(async () => {
    const trimmed = messageInput.trim();
    if ((!trimmed && attachedFiles.length === 0) || isSending) return;

    setIsSending(true);
    setChatError(null);

    const currentFiles = [...attachedFiles];

    setMessageInput("");
    setAttachedFiles([]);
    setUploadError(null);

    const imageIds = currentFiles
      .map(file => {
        const entry = uploadedImagesMapRef.current.find(img => img.fileName === file.name);
        return entry ? entry.fileId : null;
      })
      .filter((id): id is string => id !== null);

    uploadedImageIdsRef.current = imageIds;
    uploadedImagesMapRef.current = [];

    const tempImages = currentFiles.map(file => ({
      id: `temp-img-${Math.random()}`,
      url: URL.createObjectURL(file),
      originalName: file.name
    }));

    try {
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
        images: tempImages,
      };

      setMessages((prev) => [...prev, newMessage]);

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.rows = 2;
        textarea.style.height = `${INITIAL_HEIGHT}px`;
        textarea.style.overflowY = "hidden";
        textarea.focus();
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setChatError("No pudimos obtener una respuesta en este momento");
      setLastUserMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  }, [messageInput, attachedFiles, isSending]);


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

  const isProcessing = isWaitingForReply && assistantReply === null && chatError === null;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, chatError]);

  const handleBackToList = useCallback(() => {
    router.push(ROUTES.consumer.aiMessages);
  }, [router]);

  return (
    <section
      role="region"
      aria-label="Chat con el asistente de diagnóstico"
      className="flex-1 flex flex-col bg-brand-neutral/30 min-h-0"
    >
      <div className="border-b border-slate-200 bg-white flex-shrink-0">
        <div className="h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4">
          <button
            onClick={handleBackToList}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-brand-primary transition-colors"
            aria-label={t.aiDiagnosis.backToList}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar
            alt={t.aiDiagnosis.assistantName}
            initials="IA"
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-primary truncate">
              {t.aiDiagnosis.assistantName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative">
        <InfoBanner tone="info">
          Las respuestas brindadas son una orientación preliminar y no constituyen un diagnóstico técnico definitivo
        </InfoBanner>

        {!isInitialized ? null : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center mt-4">
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
            <div key={msg.id} className="flex flex-col gap-4">
              <MessageBubble
                id={msg.id}
                content={msg.content}
                sentAt={msg.sentAt}
                isExpanded={false}
                showExpandButton={false}
                onToggleExpand={() => undefined}
                isOwnMessage={msg.senderId === USER_ID}
                images={msg.images}
              />
              {msg.diagnosisCompleted && (
                <div className="mt-2 mb-2 w-full max-w-2xl self-start">
                  <RecommendedProvidersList providers={msg.recommendedProviders} diagnosisCompleted={msg.diagnosisCompleted} />
                </div>
              )}
            </div>
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

        {chatError !== null && (
          <div
            role="alert"
            className="flex justify-start"
          >
            <div className="rounded-2xl bg-red-50 border border-red-200 rounded-tl-sm px-4 py-3 flex flex-col gap-2 max-w-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-[14px] font-medium">{chatError}</span>
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

        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col border-t border-slate-200 bg-white flex-shrink-0">
        {attachedFiles.length > 0 && (
          <div role="region" aria-label="Imágenes adjuntas" className="p-3 pb-0 flex gap-2 overflow-x-auto">
            {attachedFiles.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
                <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url, name: file.name })}
                    className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 bg-slate-50 relative cursor-pointer block hover:ring-2 hover:ring-brand-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
                  >
                    <Image
                      src={url}
                      alt={`Vista previa de ${file.name}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    aria-label={`Eliminar ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="p-4 flex gap-3 items-end">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/webp"
            multiple
            onChange={handleFileChange}
            disabled={isProcessing || isSending || attachedFiles.length >= 5}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isSending || attachedFiles.length >= 5}
            aria-label="Adjuntar imágenes"
            className="text-slate-500 hover:text-brand-primary mb-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
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
            className="flex-1 resize-none px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white text-[14px] leading-6 focus-visible:ring-brand-secondary/40"
            disabled={isProcessing || isSending}
          />
          <Button
            variant="brand"
            type="button"
            onClick={handleSendMessage}
            disabled={isProcessing || isSending || (!messageInput.trim() && attachedFiles.length === 0)}
            aria-label="Enviar mensaje"
            className="h-[48px] px-5 rounded-xl font-semibold"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        {uploadError && (
          <div className="px-4 pb-2 text-red-500 text-sm font-medium">
            {uploadError}
          </div>
        )}
      </div>
      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `Vista previa de imagen ${previewImage.name}` : ""}
      />
    </section>
  );
}
