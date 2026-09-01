import { useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import { useAiConversationLoader, USER_ID } from "./useAiConversationLoader";
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
  });

  const sender = useAiMessageSender({
    client,
    chatRepository,
    simulateError: shouldSimulateError,
    effectiveConversationId: loader.effectiveConversationId,
    setMessages: loader.setMessages,
    attachments: files.attachments,
    clearAttachments: files.clearAttachments,
    jobRequestFn,
    textareaRef,
  });

  let effectiveChatError: string | null = null;
  let retryAction: (() => Promise<void>) | null = null;

  if (files.fileUploadError) {
    effectiveChatError = files.fileUploadError;
    retryAction = files.retryFailedUploads;
  } else if (loader.creationError) {
    effectiveChatError = loader.creationError;
    retryAction = loader.retryPendingCreation;
  } else if (sender.chatError) {
    effectiveChatError = sender.chatError;
    retryAction = sender.handleRetry;
  }

  const handleRetry = useCallback(async () => {
    if (retryAction) {
      await retryAction();
    }
  }, [retryAction]);

  const isWaitingForReply = sender.isWaitingForReply || loader.isCreatingPending;

  return {
    messages: loader.messages,
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
    isWaitingForReply,
    isLoadingMessages: loader.isLoadingMessages,
    messagesEndRef,
    textareaRef,
    fileInputRef: files.fileInputRef,
    handleRetry,
    handleFileChange: files.handleFileChange,
    handleRemoveAttachment: files.handleRemoveAttachment,
    handleSendMessage: sender.handleSendMessage,
    handleContactProvider: sender.handleContactProvider,
    USER_ID,
  };
}
