import { useRef } from "react";
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

  const files = useAiFileManager({
    onUploadError: (err) => sender.setChatError(err),
  });

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
    attachedFiles: files.attachedFiles,
    clearFiles: files.clearFiles,
    getUploadedImageIds: files.getUploadedImageIds,
    jobRequestFn,
    textareaRef,
  });

  return {
    messages: loader.messages,
    assistantReply: sender.assistantReply,
    chatError: sender.chatError,
    messageInput: sender.messageInput,
    setMessageInput: sender.setMessageInput,
    attachedFiles: files.attachedFiles,
    setAttachedFiles: files.setAttachedFiles,
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
    handleRetry: sender.handleRetry,
    handleFileChange: files.handleFileChange,
    handleRemoveFile: files.handleRemoveFile,
    handleSendMessage: sender.handleSendMessage,
    handleContactProvider: sender.handleContactProvider,
    USER_ID,
    ASSISTANT_ID,
  };
}
