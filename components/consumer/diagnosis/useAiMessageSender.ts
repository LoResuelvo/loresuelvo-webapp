import { useState, useCallback } from "react";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiMessage } from "@/domain/diagnosis/types";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { useClock } from "@/hooks/useClock";
import { USER_ID } from "./ai-conversation-mapper";
import { useAiReplyRequestController } from "./useAiReplyRequestController";
import { useAiContactProvider } from "./useAiContactProvider";
import type {
  AiImageAttachment,
  UploadedAiImageAttachment,
} from "./attachments/ai-image-attachment";

type AiMessageImage = NonNullable<AiMessage["images"]>[number];

function areAttachmentsSendable(
  attachments: AiImageAttachment[]
): attachments is UploadedAiImageAttachment[] {
  return attachments.every(
    (attachment) => attachment.status === "uploaded" && Boolean(attachment.uploaded)
  );
}

function snapshotAttachments(attachments: UploadedAiImageAttachment[]): {
  imageIds: string[];
  images: AiMessageImage[] | undefined;
} {
  if (attachments.length === 0) return { imageIds: [], images: undefined };
  return {
    imageIds: attachments.map((attachment) => attachment.uploaded.fileId),
    images: attachments.map((attachment) => ({
      id: attachment.uploaded.fileId,
      url: attachment.uploaded.url,
      originalName: attachment.uploaded.originalName || attachment.file.name,
    })),
  };
}

export interface UseAiMessageSenderProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  effectiveConversationId?: string | null;
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
  attachments: AiImageAttachment[];
  clearAttachments: () => void;
  jobRequestFn?: (conversationId: string, providerId: number) => Promise<unknown>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useAiMessageSender({
  client,
  chatRepository,
  simulateError = false,
  effectiveConversationId,
  setMessages,
  attachments,
  clearAttachments,
  jobRequestFn,
  textareaRef,
}: UseAiMessageSenderProps) {
  const { now } = useClock();
  const [messageInput, setMessageInput] = useState("");

  const requestController = useAiReplyRequestController({
    client,
    chatRepository,
    simulateError,
    effectiveConversationId,
    setMessages,
  });

  const { handleContactProvider } = useAiContactProvider({
    chatRepository,
    effectiveConversationId,
    jobRequestFn,
  });

  const handleSendMessage = useCallback(async () => {
    const trimmed = messageInput.trim();
    if (!trimmed && attachments.length === 0) return;
    if (!areAttachmentsSendable(attachments)) return;

    const { imageIds, images } = snapshotAttachments(attachments);

    requestController.tryExecuteAttempt(
      {
        content: trimmed,
        imageFileIds: imageIds,
      },
      () => {
        const userMessage: AiMessage = {
          id: `msg-user-${Date.now()}`,
          content: trimmed,
          senderId: USER_ID,
          images,
          sentAt: formatToLocalShortDateTime(now().toISOString()),
        };

        setMessages((prev) => [...prev, userMessage]);
        setMessageInput("");
        clearAttachments();

        if (textareaRef.current) {
          textareaRef.current.style.height = "50px";
          if (!textareaRef.current.disabled) {
            textareaRef.current.focus();
          }
        }
      }
    );
  }, [
    messageInput,
    attachments,
    requestController,
    setMessages,
    clearAttachments,
    textareaRef,
    now,
  ]);

  return {
    messageInput,
    setMessageInput,
    isSending: requestController.isWaitingForReply,
    isWaitingForReply: requestController.isWaitingForReply,
    chatError: requestController.chatError,
    handleRetry: requestController.retry,
    handleSendMessage,
    handleContactProvider,
  };
}
