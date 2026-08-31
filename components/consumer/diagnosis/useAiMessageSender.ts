import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import {
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/infrastructure/repositories/consumer/mock-assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { createAiJobRequest } from "@/application/ai-chat/create-ai-job-request";
import { useClock } from "@/hooks/useClock";
import { t } from "@/infrastructure/i18n/translations";
import { USER_ID, ASSISTANT_ID } from "./useAiConversationLoader";
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
  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
  isInitialized: boolean;
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
  messages,
  setMessages,
  isInitialized,
  attachments,
  clearAttachments,
  jobRequestFn,
  textareaRef,
}: UseAiMessageSenderProps) {
  const router = useRouter();
  const { now } = useClock();

  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const uploadedImageIdsRef = useRef<string[]>([]);

  const clearAttachmentsRef = useRef(clearAttachments);
  clearAttachmentsRef.current = clearAttachments;

  const jobRequestFnRef = useRef(jobRequestFn);
  jobRequestFnRef.current = jobRequestFn;

  const assistantClient = useMemo(
    () =>
      client ??
      createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS, {
        simulateError,
      }),
    [client, simulateError]
  );

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
          const updated = await chatRepository.sendMessage(
            effectiveConversationId,
            lastMessage.content,
            imageIds
          );
          const lastAssistantIndex = updated.messages.findLastIndex(
            (m) => m.senderRole === "chatbot"
          );
          const newMessages = updated.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders:
              index === lastAssistantIndex ? updated.recommendedProviders : undefined,
            diagnosisCompleted:
              index === lastAssistantIndex ? updated.diagnosisCompleted : undefined,
            assessment: index === lastAssistantIndex ? updated.assessment : undefined,
          }));
          setMessages(newMessages);
          reply = updated.messages[updated.messages.length - 1]?.content ?? "";
          router.refresh();
        } else if (chatRepository) {
          const created = await chatRepository.create(lastMessage.content, imageIds);
          const lastAssistantIndex = created.messages.findLastIndex(
            (m) => m.senderRole === "chatbot"
          );
          const newMessages = created.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders:
              index === lastAssistantIndex ? created.recommendedProviders : undefined,
            diagnosisCompleted:
              index === lastAssistantIndex ? created.diagnosisCompleted : undefined,
            assessment: index === lastAssistantIndex ? created.assessment : undefined,
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
            sentAt: formatToLocalShortDateTime(now().toISOString()),
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
        setChatError(t.aiDiagnosis.errors.noResponse);
      }
    };

    sendMessageToApi();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, assistantClient, isInitialized, effectiveConversationId, chatRepository, router]);

  const handleRetry = useCallback(() => {
    if (!lastUserMessage) return;
    setChatError(null);
    setIsWaitingForReply(true);
  }, [lastUserMessage]);

  const handleSendMessage = () => {
    const trimmed = messageInput.trim();
    if ((!trimmed && attachments.length === 0) || isSending) return;
    if (!areAttachmentsSendable(attachments)) return;

    const { imageIds, images } = snapshotAttachments(attachments);
    uploadedImageIdsRef.current = imageIds;

    setIsSending(true);
    setChatError(null);

    const userMessage: AiMessage = {
      id: `msg-user-${Date.now()}`,
      content: trimmed,
      senderId: USER_ID,
      images,
      sentAt: formatToLocalShortDateTime(now().toISOString()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageInput("");
    clearAttachmentsRef.current();

    if (textareaRef.current) {
      textareaRef.current.style.height = "50px";
      if (!textareaRef.current.disabled) {
        textareaRef.current.focus();
      }
    }

    setIsSending(false);
  };

  const handleContactProvider = useCallback(
    async (providerId: number) => {
      let result: unknown;
      if (jobRequestFnRef.current) {
        result = await jobRequestFnRef.current(effectiveConversationId ?? "", providerId);
      } else if (chatRepository && effectiveConversationId) {
        result = await createAiJobRequest(chatRepository, effectiveConversationId, providerId);
      } else {
        throw new Error("No repository or jobRequestFn provided");
      }
      const resObj =
        result && typeof result === "object" ? (result as Record<string, unknown>) : null;
      if (resObj && resObj.status === 409) {
        const err = new Error("409: Ya existe una solicitud de trabajo abierta") as Error & {
          status?: number;
        };
        err.status = 409;
        throw err;
      }
      router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
    },
    [chatRepository, effectiveConversationId, router]
  );

  return {
    assistantReply,
    setAssistantReply,
    chatError,
    setChatError,
    messageInput,
    setMessageInput,
    isSending,
    isWaitingForReply,
    setIsWaitingForReply,
    lastUserMessage,
    setLastUserMessage,
    handleRetry,
    handleSendMessage,
    handleContactProvider,
  };
}
