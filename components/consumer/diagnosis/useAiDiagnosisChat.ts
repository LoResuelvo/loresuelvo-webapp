import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { AssistantClient } from "@/ports/assistant-client";
import type { AiChatRepository } from "@/ports/ai-chat-repository";
import {
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/infrastructure/repositories/mock-assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import { t } from "@/infrastructure/i18n/translations";
import { ClientFileRepository } from "@/infrastructure/repositories/client-repositories";
import { formatToLocalShortDateTime } from "@/infrastructure/repositories/conversation-mapper";
import { createAiJobRequest } from "@/application/ai-chat/create-ai-job-request";

const fileRepository = new ClientFileRepository();

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";

interface UseAiDiagnosisChatProps {
  client?: AssistantClient;
  chatRepository?: AiChatRepository;
  simulateError?: boolean;
  conversationId?: string | null;
  jobRequestFn?: (conversationId: string, providerId: number) => Promise<unknown>;
}

export function useAiDiagnosisChat({ client, chatRepository, simulateError = false, conversationId, jobRequestFn }: UseAiDiagnosisChatProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSimulateError = searchParams.get("simulate") === "error";
  const shouldSimulateError = simulateError || urlSimulateError;
  const effectiveConversationId = conversationId ?? searchParams.get("id");

  const [messages, setMessages] = useState<AiMessage[]>(() => {
    if (typeof window === "undefined") return [];
    const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
    if (!pendingRaw) return [];
    const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
    return [{
      id: `temp-${Date.now()}`,
      content: pending.text,
      senderId: USER_ID,
      sentAt: formatToLocalShortDateTime(new Date().toISOString()),
    }];
  });
  const [assistantReply, setAssistantReply] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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
    if (!effectiveConversationId && typeof window !== "undefined") {
      const pendingRaw = window.sessionStorage.getItem("pendingAiMessage");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as { text: string; imageIds: string[] };
        window.sessionStorage.removeItem("pendingAiMessage");

        setIsWaitingForReply(true);
        setIsInitialized(true);

        if (chatRepository) {
          chatRepository.create(pending.text, pending.imageIds.length > 0 ? pending.imageIds : undefined)
            .then((conversation) => {
              router.replace(`${ROUTES.consumer.aiMessages}?id=${conversation.id}`);
            })
            .catch((err) => {
              console.error("Failed to create conversation:", err);
              setChatError(t.aiDiagnosis.errors.noResponse);
              setIsWaitingForReply(false);
            });
        }
        return;
      }

      if (messages.length > 0) return;
    }

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
      setIsLoadingMessages(true);
      chatRepository.getById(effectiveConversationId)
        .then((data) => {
          const lastAssistantIndex = data.messages.findLastIndex((m) => m.senderRole === "chatbot");
          const msgs = data.messages.map((msg, index) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderRole === "consumer" ? USER_ID : ASSISTANT_ID,
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? data.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? data.diagnosisCompleted : undefined,
            assessment: index === lastAssistantIndex ? data.assessment : undefined,
          }));
          setMessages(msgs);
        })
        .catch(console.error)
        .finally(() => setIsLoadingMessages(false));
    }
    setIsInitialized(true);
  }, [effectiveConversationId, chatRepository, router, messages.length]);

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
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? updated.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? updated.diagnosisCompleted : undefined,
            assessment: index === lastAssistantIndex ? updated.assessment : undefined,
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
            sentAt: formatToLocalShortDateTime(msg.sentAt),
            images: msg.images,
            recommendedProviders: index === lastAssistantIndex ? created.recommendedProviders : undefined,
            diagnosisCompleted: index === lastAssistantIndex ? created.diagnosisCompleted : undefined,
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
            sentAt: formatToLocalShortDateTime(new Date().toISOString()),
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
            const presigned = await fileRepository.getPresignedUrl(file.name, file.type, file.size, "conversation_message_image");
            await fileRepository.uploadFile(presigned.upload_url, file, presigned.headers);
            const confirm = await fileRepository.confirmUpload(presigned.file_id, presigned.key, file.type, file.size);
            uploadedImagesMapRef.current.push({
              fileName: file.name,
              fileId: confirm.id
            });
          } catch (uploadErr) {
            console.error("Error al subir archivo inmediatamente:", uploadErr);
            setChatError(t.aiDiagnosis.errors.imageUpload);
          }
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachedFiles(prev => {
      const newFiles = prev.filter((_, idx) => idx !== indexToRemove);
      const removedFile = prev[indexToRemove];
      if (removedFile) {
        uploadedImagesMapRef.current = uploadedImagesMapRef.current.filter(m => m.fileName !== removedFile.name);
      }
      return newFiles;
    });
  };

  const handleSendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed && attachedFiles.length === 0) return;

    uploadedImageIdsRef.current = uploadedImagesMapRef.current.map(m => m.fileId);

    setIsSending(true);
    setChatError(null);

    const imagesToDisplay = attachedFiles.length > 0 ? attachedFiles.map(file => ({
      id: `temp-${Date.now()}-${file.name}`,
      url: URL.createObjectURL(file),
      originalName: file.name
    })) : undefined;

    const userMessage: AiMessage = {
      id: `msg-user-${Date.now()}`,
      content: trimmed,
      senderId: USER_ID,
      images: imagesToDisplay,
      sentAt: formatToLocalShortDateTime(new Date().toISOString()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageInput("");
    setAttachedFiles([]);
    uploadedImagesMapRef.current = [];

    if (textareaRef.current) {
      textareaRef.current.style.height = '50px';
    }

    try {
      if (textareaRef.current && typeof document !== 'undefined') {
        const interval = setInterval(() => {
          if (textareaRef.current && !textareaRef.current.disabled) {
            clearInterval(interval);
            textareaRef.current.focus();
          }
        }, 1);
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setChatError(t.aiDiagnosis.errors.noResponse);
      setLastUserMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleContactProvider = useCallback(
    async (providerId: number) => {
      if (jobRequestFn) {
        await jobRequestFn(effectiveConversationId ?? "", providerId);
      } else if (chatRepository && effectiveConversationId) {
        await createAiJobRequest(chatRepository, effectiveConversationId, providerId);
      } else {
        throw new Error("No repository or jobRequestFn provided");
      }
      router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
    },
    [chatRepository, effectiveConversationId, jobRequestFn, router]
  );

  return {
    messages,
    assistantReply,
    chatError,
    messageInput,
    setMessageInput,
    attachedFiles,
    setAttachedFiles,
    previewImage,
    setPreviewImage,
    uploadError,
    isSending,
    isInitialized,
    isWaitingForReply,
    isLoadingMessages,
    lastUserMessage,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    handleRetry,
    handleFileChange,
    handleRemoveFile,
    handleSendMessage,
    handleContactProvider,
    USER_ID,
    ASSISTANT_ID
  };
}
