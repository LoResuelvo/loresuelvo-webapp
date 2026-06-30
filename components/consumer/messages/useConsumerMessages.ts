import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, getJobRequestForConversation, createConversation, sendMessage } from "@/app/consumidor/mensajes/actions";
import { t } from "@/infrastructure/i18n/translations";
import { useWebSocket } from "@/infrastructure/websocket";
import { Message, JobRequestInfo, ConsumerConversationContact as ConversationContact } from "@/domain/messaging/types";
import { ClientConversationRepository, ClientFileRepository } from "@/infrastructure/repositories/client-repositories";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/local-offline-queue-repository";
import { sendMessageWithAttachments } from "@/application/messaging/send-message-with-attachments";
import { transformApiMessageToDomain, formatToLocalShortDateTime } from "@/infrastructure/repositories/conversation-mapper";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import { clearDraft, loadDraft, saveDraft, type DraftFileMeta } from "@/lib/message-drafts";

function fileToMeta(file: File): DraftFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

function metaToFile(meta: DraftFileMeta): File {
  return new File([new Blob([])], meta.name, { type: meta.type });
}

const conversationRepository = new ClientConversationRepository({ create: createConversation, sendMessage });
const fileRepository = new ClientFileRepository();
const offlineQueueRepo = new LocalOfflineQueueRepository();

let lastConsumerProviderId: string | null = null;

export function useConsumerMessages(session: AuthSession | null, contacts: ConversationContact[], myUserId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProviderId = searchParams.get("provider_id");
  const selectedProviderId = urlProviderId ?? lastConsumerProviderId;

  useEffect(() => {
    if (selectedProviderId) {
      lastConsumerProviderId = selectedProviderId;
    }
  }, [selectedProviderId]);

  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);
  const justLoadedRef = useRef(false);
  const [activeJobRequest, setActiveJobRequest] = useState<JobRequestInfo | null>(null);
  const [isConversationPending, setIsConversationPending] = useState<boolean>(false);
  const [localContacts, setLocalContacts] = useState<ConversationContact[]>(contacts);

  // Keep localContacts in sync when server-side contacts prop changes
  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = contacts.find(c => c.providerId === selectedProviderId);

  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

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

  const counterpartIdRef = useRef<string | null>(null);

  const { subscribe, resetUnread } = useWebSocket();

  useEffect(() => {
    setIsConversationPending(selectedContact?.pending ?? false);
  }, [selectedContact?.id, selectedContact?.pending]);

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const allMessages = [
    ...loadedMessages,
    ...localMessages.filter(
      (local) => !loadedMessages.some((loaded) => loaded.id === local.id)
    ),
  ];

  useEffect(() => {
    if (!selectedProviderId) return;

    if (!effectiveConversationId || !/^\d+$/.test(effectiveConversationId)) return;

    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    getConversationDetail(effectiveConversationId)
      .then((data) => {
        const messages: Message[] = data.messages.map(msg => ({
          id: String(msg.id),
          content: msg.content,
          senderId: msg.senderId === "consumer" ? myUserId : String(data.counterpart.id),
          sentAt: msg.sentAt,
          images: msg.images,
        }));
        
        const pendingMessages = offlineQueueRepo.loadPendingMessages(effectiveConversationId);
        const allMessages = [...messages];
        pendingMessages.forEach(pending => {
          if (!allMessages.some(m => m.id === pending.id || m.content === pending.content)) {
            allMessages.push(pending);
          }
        });
        
        if (pendingMessages.length > 0) {
          offlineQueueRepo.clearPendingMessages(effectiveConversationId);
        }
        
        setLoadedMessages(allMessages);
        counterpartIdRef.current = String(data.counterpart.id);

        getJobRequestForConversation(effectiveConversationId)
          .then(jr => setActiveJobRequest(jr ? {
            title: jr.title,
            description: jr.description,
            providerName: data.counterpart.name,
            providerSurname: data.counterpart.surname,
            providerProfilePhotoUrl: data.counterpart.profilePhotoUrl,
            images: jr.images,
          } : null))
          .catch(() => setActiveJobRequest(null));
      })
      .catch(console.error);
  }, [selectedProviderId, effectiveConversationId, myUserId]);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type !== "conversation.message.created") return;

      const incomingConvId = String(event.conversation_id);
      const currentConvId = effectiveConvIdRef.current;

      const previewText = event.message.content.length > 40
        ? event.message.content.slice(0, 40) + "…"
        : event.message.content;

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
        if (event.message.sender_role === "consumer") return;

        setIsConversationPending(false);

        const newMessage = transformApiMessageToDomain(
          event.message,
          myUserId,
          counterpartIdRef.current ?? incomingConvId,
          "consumer"
        );

        setLoadedMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        resetUnread();
      }
    });

    return unsubscribe;
  }, [subscribe, resetUnread, myUserId]);

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachedFiles.length === 0) || !selectedProviderId || isSending || isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    const messageContent = messageInput.trim() || undefined;
    const currentFiles = [...attachedFiles];
    
    const tempId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: session?.user?.id ?? myUserId,
      sentAt: "Ahora",
      images: currentFiles.map(file => ({
        id: `temp-img-${Math.random()}`,
        url: URL.createObjectURL(file),
        originalName: file.name
      }))
    };

    setLocalMessages(prev => [...prev, optimisticMessage]);
    
    const previewText = messageContent 
      ? (messageContent.length > 40 ? messageContent.slice(0, 40) + "…" : messageContent)
      : `📷 ${t.messaging.attachedImage}`;
      
    setLocalContacts(prev => prev.map(c => 
      c.providerId === selectedProviderId 
        ? { ...c, lastMessage: previewText, lastMessageAt: "Ahora" } 
        : c
    ));
    
    setMessageInput("");
    setAttachedFiles([]);
    const interval = setInterval(() => {
      if (typeof document === 'undefined') return;
      const inputEl = document.querySelector<HTMLInputElement>('[placeholder="Escribe un mensaje..."]');
      if (inputEl && !inputEl.disabled) {
        clearInterval(interval);
        inputEl.focus();
      }
    }, 1);

    const currentConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

    try {
      const { message, conversationId } = await sendMessageWithAttachments(
        conversationRepository,
        fileRepository,
        {
          conversationId: currentConversationId ?? null,
          counterpartId: parseInt(selectedProviderId),
          myUserId: session?.user?.id ?? myUserId,
          myRole: "consumer",
          content: messageContent,
          files: currentFiles,
        }
      );

      if (conversationId !== currentConversationId) {
        setActiveConversationId(conversationId);
        justCreatedRef.current = true;
      }

      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempId);
        return [...filtered, message];
      });
      clearDraft(currentConversationId ?? effectiveConversationId ?? "");
    } catch (error) {
      console.error("Error sending message:", error);
      const pendingMsg: Message = { ...optimisticMessage, id: `pending-${tempId}` };
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => [...prev, pendingMsg]);
      const convIdToQueue = currentConversationId || "new";
      const existingPending = offlineQueueRepo.loadPendingMessages(convIdToQueue);
      offlineQueueRepo.savePendingMessages(convIdToQueue, [...existingPending, pendingMsg]);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const handleContactClick = (providerId: string) => {
    router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
  };

  const viewMessages = allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    sentAt: msg.sentAt,
    senderId: msg.senderId,
    images: msg.images,
  }));

  const contactsWithUnread = localContacts.map((c) => ({
    ...c,
    pending: c.providerId === selectedProviderId ? isConversationPending : c.pending,
  }));

  return {
    messageInput,
    setMessageInput,
    attachedFiles,
    setAttachedFiles,
    isSending,
    expandedMessages,
    messagesEndRef,
    inputRef,
    activeJobRequest,
    isConversationPending,
    selectedContact,
    selectedProviderId,
    toggleMessageExpanded,
    handleSendMessage,
    handleContactClick,
    viewMessages,
    contactsWithUnread,
  };
}
