import { useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import { useAiConversationLoader, USER_ID, ASSISTANT_ID } from "./useAiConversationLoader";
import { useAiFileManager } from "./useAiFileManager";
import { useAiMessageSender } from "./useAiMessageSender";

export interface UseAiDiagnosisChatProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  conversationId?: string | null;
  jobRequestFn?: (conversationId: string, providerId: number) => Promise<unknown>;
}

export function useAiDiagnosisChat({
  client,
  chatRepository,
  simulateError = false,
  conversationId,
  jobRequestFn,
}: UseAiDiagnosisChatProps) {
  const searchParams = useSearchParams();
  const urlSimulateError = searchParams.get("simulate") === "error";
  const shouldSimulateError = simulateError || urlSimulateError;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const files = useAiFileManager();

  const loader = useAiConversationLoader({
    conversationId,
    chatRepository,
    onCreationError: (err) => sender.setChatError(err),
    setIsWaitingForReply: (waiting) => sender.setIsWaitingForReply(waiting),
  });

  const sender = useAiMessageSender({
    client,
    chatRepository,
    simulateError: shouldSimulateError,
    effectiveConversationId: loader.effectiveConversationId,
    messages: loader.messages,
    setMessages: loader.setMessages,
    isInitialized: loader.isInitialized,
    attachments: files.attachments,
    clearAttachments: files.clearAttachments,
    jobRequestFn,
    textareaRef,
  });

  const handleRetry = useCallback(async () => {
    if (files.fileUploadError) {
      await files.retryFailedUploads();
    } else {
      await sender.handleRetry();
    }
  }, [files, sender]);

  const effectiveChatError = files.fileUploadError ?? sender.chatError;

  return {
    messages: loader.messages,
    assistantReply: sender.assistantReply,
    chatError: effectiveChatError,
    messageInput: sender.messageInput,
    setMessageInput: sender.setMessageInput,
    attachments: files.attachments,
    isUploadingFiles: files.isUploadingFiles,
    hasFailedFiles: files.hasFailedFiles,
    areAttachmentsReady: files.areAttachmentsReady,
    previewImage: files.previewImage,
    setPreviewImage: files.setPreviewImage,
    uploadError: files.uploadError,
    isSending: sender.isSending,
    isInitialized: loader.isInitialized,
    isWaitingForReply: sender.isWaitingForReply,
    isLoadingMessages: loader.isLoadingMessages,
    lastUserMessage: sender.lastUserMessage,
    messagesEndRef,
    textareaRef,
    fileInputRef: files.fileInputRef,
    handleRetry,
    handleFileChange: files.handleFileChange,
    handleRemoveAttachment: files.handleRemoveAttachment,
    handleSendMessage: sender.handleSendMessage,
    handleContactProvider: sender.handleContactProvider,
    USER_ID,
    ASSISTANT_ID,
  };
}
