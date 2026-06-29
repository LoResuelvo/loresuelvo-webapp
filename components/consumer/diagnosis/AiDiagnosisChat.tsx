"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AlertCircle, Loader2, MessageSquare, ChevronLeft, Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import MessageBubble from "@/components/messaging/MessageBubble";
import InfoBanner from "@/components/messaging/InfoBanner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePreviewModal } from "@/components/messaging/ImagePreviewModal";
import { AssistantClient } from "@/ports/assistant-client";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import { RecommendedProvidersList } from "./RecommendedProvidersList";
import { t } from "@/infrastructure/i18n/translations";
import { useAiDiagnosisChat } from "./useAiDiagnosisChat";
import { cn } from "@/lib/utils";

const MAX_LINES = 6;
const INITIAL_HEIGHT = 50;
const LINE_HEIGHT_CSS = 24;

interface AiDiagnosisChatProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  conversationId?: string | null;
  className?: string;
}

export default function AiDiagnosisChat({ client, chatRepository, simulateError = false, conversationId, className }: AiDiagnosisChatProps = {}) {
  const router = useRouter();
  
  const {
    messages,
    chatError,
    messageInput,
    setMessageInput,
    attachedFiles,
    previewImage,
    setPreviewImage,
    uploadError,
    isSending,
    isInitialized,
    isWaitingForReply,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    handleRetry,
    handleFileChange,
    handleRemoveFile,
    handleSendMessage,
    USER_ID,
  } = useAiDiagnosisChat({ client, chatRepository, simulateError, conversationId });

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
  }, [messageInput, textareaRef]);

  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);
    adjustHeight();
  }, [adjustHeight, setMessageInput]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  useEffect(() => {
    if (!messageInput && textareaRef.current) {
      textareaRef.current.rows = 2;
      textareaRef.current.style.height = `${INITIAL_HEIGHT}px`;
      textareaRef.current.style.overflowY = "hidden";
    }
  }, [messageInput, textareaRef]);

  const setTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (node) {
      node.rows = 2;
      node.style.height = `${INITIAL_HEIGHT}px`;
      node.style.overflowY = "hidden";
    }
  }, [textareaRef]);

  const isProcessing = isWaitingForReply && chatError === null;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, chatError, messagesEndRef]);

  const handleBackToList = useCallback(() => {
    router.push(ROUTES.consumer.aiMessages);
  }, [router]);

  return (
    <section
      role="region"
      aria-label="Chat con el asistente de diagnóstico"
      className={cn("flex-1 flex flex-col bg-brand-neutral/30 min-h-0", className)}
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
          {t.aiDiagnosis.disclaimer}
        </InfoBanner>

        {!isInitialized ? null : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center mt-4">
            <div>
              <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-4" aria-hidden="true" />
              <h1 className="text-[22px] font-bold text-brand-primary">
                {t.aiDiagnosis.chatTitle}
              </h1>
              <p className="mt-2 text-[14px] text-slate-500">
                {t.aiDiagnosis.chatDescription}
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
                  <RecommendedProvidersList providers={msg.recommendedProviders} diagnosisCompleted={msg.diagnosisCompleted} className="mt-6" />
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
              <span className="text-[13px]">{t.aiDiagnosis.assistantTyping}</span>
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
                {t.aiDiagnosis.retry}
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col border-t border-slate-200 bg-white flex-shrink-0">
        {attachedFiles.length > 0 && (
          <div role="region" aria-label={t.aiDiagnosis.attachedImages} className="p-3 pb-0 flex gap-2 overflow-x-auto">
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
                    onClick={() => handleRemoveFile(idx)}
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
            aria-label={t.aiDiagnosis.attachImages}
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
            placeholder={t.messaging.inputPlaceholder}
            className="flex-1 resize-none px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white text-[14px] leading-6 focus-visible:ring-brand-secondary/40"
            disabled={isProcessing || isSending}
          />
          <Button
            variant="brand"
            type="button"
            onClick={handleSendMessage}
            disabled={isProcessing || isSending || (!messageInput.trim() && attachedFiles.length === 0)}
            aria-label={t.messaging.sendLabel}
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
