import { useState, useEffect, useRef } from "react";
import { AuthSession } from "@/infrastructure/auth/types";
import { useWebSocket } from "@/infrastructure/websocket";
import { Message, ConversationDetailInfo } from "@/domain/messaging/types";
import { ConversationRepository } from "@/ports/messaging/conversation-repository";
import { AudioConversationRepository } from "@/ports/messaging/audio-conversation-repository";
import { FileRepository } from "@/ports/files/file-repository";
import { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import { sendMessageWithAttachments } from "@/application/messaging/send-message-with-attachments";
import { AudioUploadError, sendAudioMessage as sendAudioMessageUseCase, type AudioUploadFailureStage } from "@/application/messaging/send-audio-message";
import { transformApiMessageToDomain, formatToLocalShortDateTime } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { clearDraft, loadDraft, saveDraft, type DraftFileMeta } from "@/lib/messaging/message-drafts";
import { useClock } from "@/hooks/useClock";
import { formatMessagePreview } from "@/lib/messaging/message-preview";
import { t } from "@/infrastructure/i18n/translations";

function fileToMeta(file: File): DraftFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

function metaToFile(meta: DraftFileMeta): File {
  return new File([new Blob([])], meta.name, { type: meta.type });
}

export interface BaseConversationContact {
  id: string;
  lastMessage?: string;
  lastMessageAt?: string;
  pending?: boolean;
}

export interface UseMessagingCoreConfig<TContact extends BaseConversationContact> {
  session: AuthSession | null;
  myUserId: string;
  myRole: "consumer" | "provider";
  selectedCounterpartId: string | null;
  contacts: TContact[];
  getCounterpartIdFromContact: (contact: TContact) => string;
  getConversationDetail: (id: string) => Promise<ConversationDetailInfo>;
  conversationRepository: ConversationRepository & AudioConversationRepository;
  fileRepository: FileRepository;
  offlineQueueRepository: OfflineQueueRepository;
  onConversationLoaded?: (conversationId: string, data: ConversationDetailInfo) => void;
  onNewIncomingMessage?: (message: Message) => void;
}

export interface UseMessagingCoreReturn<TContact extends BaseConversationContact> {
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  expandedMessages: Set<string>;
  toggleMessageExpanded: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  viewMessages: Message[];
  localContacts: TContact[];
  setLocalContacts: React.Dispatch<React.SetStateAction<TContact[]>>;
  selectedContact: TContact | undefined;
  effectiveConversationId: string | undefined;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  handleSendMessage: () => Promise<void>;
  handleSendAudio: (file: File) => Promise<boolean | AudioUploadFailureStage>;
}

export function useMessagingCore<TContact extends BaseConversationContact>({
  session,
  myUserId,
  myRole,
  selectedCounterpartId,
  contacts,
  getCounterpartIdFromContact,
  getConversationDetail,
  conversationRepository,
  fileRepository,
  offlineQueueRepository,
  onConversationLoaded,
  onNewIncomingMessage,
}: UseMessagingCoreConfig<TContact>): UseMessagingCoreReturn<TContact> {
  const { now } = useClock();
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [localContacts, setLocalContacts] = useState<TContact[]>(contacts);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);
  const justLoadedRef = useRef(false);
  const counterpartIdRef = useRef<string | null>(null);

  const onConversationLoadedRef = useRef(onConversationLoaded);
  onConversationLoadedRef.current = onConversationLoaded;

  const onNewIncomingMessageRef = useRef(onNewIncomingMessage);
  onNewIncomingMessageRef.current = onNewIncomingMessage;

  const getConversationDetailRef = useRef(getConversationDetail);
  getConversationDetailRef.current = getConversationDetail;

  const getCounterpartIdRef = useRef(getCounterpartIdFromContact);
  getCounterpartIdRef.current = getCounterpartIdFromContact;

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = contacts.find(
    (c) => getCounterpartIdRef.current(c) === selectedCounterpartId
  );
  const effectiveConversationId =
    activeConversationId || selectedContact?.id?.replace("conv-", "");

  const effectiveConvIdRef = useRef(effectiveConversationId);
  effectiveConvIdRef.current = effectiveConversationId;

  useEffect(() => {
    if (!effectiveConversationId) return;
    const draft = loadDraft(effectiveConversationId);
    setMessageInput(draft.text);
    setAttachedFiles(draft.files.map(metaToFile));
    justLoadedRef.current = true;
  }, [effectiveConversationId]);

  useEffect(() => {
    if (!effectiveConversationId) return;
    if (isSendingRef.current) return;
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    if (messageInput || attachedFiles.length > 0) {
      saveDraft(effectiveConversationId, messageInput, attachedFiles.map(fileToMeta));
    } else {
      clearDraft(effectiveConversationId);
    }
  }, [effectiveConversationId, messageInput, attachedFiles]);

  const { subscribe, resetUnread } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type !== "conversation.message.created") return;

      const incomingConvId = String(event.conversation_id);
      const currentConvId = effectiveConvIdRef.current;

      const previewText = formatMessagePreview(event.message);
      const sentAtFormatted = formatToLocalShortDateTime(event.message.created_on);

      setLocalContacts((prev) =>
        prev.map((c) => {
          const cId = c.id.replace("conv-", "");
          return cId === incomingConvId
            ? { ...c, lastMessage: previewText, lastMessageAt: sentAtFormatted }
            : c;
        })
      );

      if (incomingConvId === currentConvId) {
        if (event.message.sender_role === myRole) return;

        const newMessage = transformApiMessageToDomain(
          event.message,
          myUserId,
          counterpartIdRef.current ?? incomingConvId,
          myRole
        );

        setLoadedMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        onNewIncomingMessageRef.current?.(newMessage);
        resetUnread();
      }
    });

    return unsubscribe;
  }, [subscribe, resetUnread, myUserId, myRole]);

  useEffect(() => {
    if (!selectedCounterpartId || !effectiveConversationId || !/^\d+$/.test(effectiveConversationId)) return;

    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    getConversationDetailRef.current(effectiveConversationId)
      .then((data) => {
        const messages: Message[] = data.messages.map((msg) => ({
          ...msg,
          id: String(msg.id),
          senderId: msg.senderId === myRole ? myUserId : String(data.counterpart.id),
        }));

        const pendingMessages = offlineQueueRepository.loadPendingMessages(effectiveConversationId);
        const allMsgs = [...messages];
        pendingMessages.forEach((pending) => {
          if (!allMsgs.some((m) => m.id === pending.id || m.content === pending.content)) {
            allMsgs.push(pending);
          }
        });

        if (pendingMessages.length > 0) {
          offlineQueueRepository.clearPendingMessages(effectiveConversationId);
        }

        setLoadedMessages((prev) => {
          const merged = [...allMsgs];
          prev.forEach((existing) => {
            if (!merged.some((m) => m.id === existing.id)) {
              merged.push(existing);
            }
          });
          return merged;
        });
        counterpartIdRef.current = String(data.counterpart.id);

        onConversationLoadedRef.current?.(effectiveConversationId, data);
      })
      .catch(console.error);
  }, [
    selectedCounterpartId,
    effectiveConversationId,
    myUserId,
    myRole,
    offlineQueueRepository,
  ]);

  const handleSendMessage = async () => {
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !selectedCounterpartId ||
      isSending ||
      isSendingRef.current
    )
      return;
    isSendingRef.current = true;
    setIsSending(true);

    const messageContent = messageInput.trim() || undefined;
    const currentFiles = [...attachedFiles];

    const tempId = `local-${now().getTime()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: session?.user?.id ?? myUserId,
      sentAt: "Ahora",
      createdOn: now().toISOString(),
      images: currentFiles.map((file) => ({
        id: `temp-img-${Math.random()}`,
        url: URL.createObjectURL(file),
        originalName: file.name,
      })),
    };

    setLocalMessages((prev) => [...prev, optimisticMessage]);

    const previewText = messageContent
      ? messageContent.length > 40
        ? messageContent.slice(0, 40) + "…"
        : messageContent
      : `📷 ${t.messaging.attachedImage}`;

    setLocalContacts((prev) =>
      prev.map((c) =>
        getCounterpartIdFromContact(c) === selectedCounterpartId
          ? { ...c, lastMessage: previewText, lastMessageAt: "Ahora" }
          : c
      )
    );

    setMessageInput("");
    setAttachedFiles([]);

    const currentConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

    try {
      const { message, conversationId } = await sendMessageWithAttachments(
        conversationRepository,
        fileRepository,
        {
          conversationId: currentConversationId ?? null,
          counterpartId: parseInt(selectedCounterpartId),
          myUserId: session?.user?.id ?? myUserId,
          myRole,
          content: messageContent,
          files: currentFiles,
        }
      );

      if (conversationId !== currentConversationId) {
        setActiveConversationId(conversationId);
        justCreatedRef.current = true;
      }

      setLocalMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setLoadedMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempId);
        return [...filtered, message];
      });
      clearDraft(currentConversationId ?? effectiveConversationId ?? "");
    } catch (error) {
      console.error("Error sending message:", error);
      const pendingMsg: Message = { ...optimisticMessage, id: `pending-${tempId}` };
      setLocalMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setLoadedMessages((prev) => [...prev, pendingMsg]);
      const convIdToQueue = currentConversationId || "new";
      const existingPending = offlineQueueRepository.loadPendingMessages(convIdToQueue);
      offlineQueueRepository.savePendingMessages(convIdToQueue, [...existingPending, pendingMsg]);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const handleSendAudio = async (file: File): Promise<boolean | AudioUploadFailureStage> => {
    if (!selectedCounterpartId || isSending || isSendingRef.current) return false;

    const currentConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");
    if (!currentConversationId || !/^\d+$/.test(currentConversationId)) return false;

    isSendingRef.current = true;
    setIsSending(true);
    const tempId = `local-audio-${now().getTime()}`;
    const optimisticUrl = URL.createObjectURL(file);
    const optimisticMessage: Message = {
      id: tempId,
      senderId: session?.user?.id ?? myUserId,
      sentAt: "Ahora",
      createdOn: now().toISOString(),
      audio: {
        id: tempId,
        url: optimisticUrl,
        originalName: file.name,
        durationSeconds: 0,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    };

    setLocalMessages((prev) => [...prev, optimisticMessage]);
    setLocalContacts((prev) =>
      prev.map((c) =>
        getCounterpartIdFromContact(c) === selectedCounterpartId
          ? { ...c, lastMessage: "🎤 Audio", lastMessageAt: "Ahora" }
          : c
      )
    );

    try {
      const { message } = await sendAudioMessageUseCase(conversationRepository, fileRepository, {
        conversationId: currentConversationId,
        counterpartId: Number(selectedCounterpartId),
        myUserId: session?.user?.id ?? myUserId,
        myRole,
        file,
      });
      setLocalMessages((prev) => [...prev.filter((msg) => msg.id !== tempId), message]);
      URL.revokeObjectURL(optimisticUrl);
      return true;
    } catch (error) {
      console.error("Error sending audio message:", error);
      setLocalMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      URL.revokeObjectURL(optimisticUrl);
      return error instanceof AudioUploadError ? error.stage : "send";
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const allMessages = [
    ...loadedMessages,
    ...localMessages.filter((local) => !loadedMessages.some((loaded) => loaded.id === local.id)),
  ];

  const viewMessages = allMessages.map((msg) => ({ ...msg }));

  return {
    messageInput,
    setMessageInput,
    attachedFiles,
    setAttachedFiles,
    isSending,
    expandedMessages,
    toggleMessageExpanded,
    messagesEndRef,
    viewMessages,
    localContacts,
    setLocalContacts,
    selectedContact,
    effectiveConversationId,
    activeConversationId,
    setActiveConversationId,
    handleSendMessage,
    handleSendAudio,
  };
}
