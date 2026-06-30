import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, acceptJobRequest, getJobRequestForConversation, createConversation, sendMessage } from "@/app/prestador/mensajes/actions";
import { t } from "@/infrastructure/i18n/translations";
import { useWebSocket } from "@/infrastructure/websocket";
import type { ProviderWorkRequest } from "@/domain/provider/types";
import { Message, ProviderConversationContact as ConversationContact } from "@/domain/messaging/types";
import { ClientConversationRepository, ClientFileRepository } from "@/infrastructure/repositories/client-repositories";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/local-offline-queue-repository";
import { sendMessageWithAttachments } from "@/application/messaging/send-message-with-attachments";
import { transformApiMessageToDomain, formatToLocalShortDateTime } from "@/infrastructure/repositories/conversation-mapper";

const conversationRepository = new ClientConversationRepository({ create: createConversation, sendMessage });
const fileRepository = new ClientFileRepository();
const offlineQueueRepo = new LocalOfflineQueueRepository();

let lastProviderConsumerId: string | null = null;

export function useProviderMessages(session: AuthSession | null, contacts: ConversationContact[], myUserId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlConsumerId = searchParams.get("consumer_id");
  const selectedConsumerId = urlConsumerId ?? lastProviderConsumerId;

  useEffect(() => {
    if (selectedConsumerId) {
      lastProviderConsumerId = selectedConsumerId;
    }
  }, [selectedConsumerId]);
  
  const [messageInput, setMessageInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [acceptedConversations, setAcceptedConversations] = useState<Set<string>>(new Set());
  const [activeJobRequest, setActiveJobRequest] = useState<{ id: number; title: string; description: string; consumerName: string } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [localContacts, setLocalContacts] = useState<ConversationContact[]>(contacts);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = contacts.find(c => c.consumerId === selectedConsumerId);
  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");
  
  const effectiveConvIdRef = useRef(effectiveConversationId);
  effectiveConvIdRef.current = effectiveConversationId;
  const counterpartIdRef = useRef<string | null>(null);

  const { subscribe, resetUnread } = useWebSocket();

  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
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
    if (!selectedConsumerId || !effectiveConversationId || !/^\d+$/.test(effectiveConversationId)) return;

    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    getConversationDetail(effectiveConversationId)
      .then((data) => {
        const messages: Message[] = data.messages.map(msg => ({
          id: String(msg.id),
          content: msg.content,
          senderId: msg.senderId === "provider" ? myUserId : String(data.counterpart.id),
          sentAt: msg.sentAt,
          images: msg.images,
        }));
        
        const pendingMessages = offlineQueueRepo.loadPendingMessages(effectiveConversationId);
        const allMsgs = [...messages];
        pendingMessages.forEach(pending => {
          if (!allMsgs.some(m => m.id === pending.id || m.content === pending.content)) {
            allMsgs.push(pending);
          }
        });
        
        if (pendingMessages.length > 0) {
          offlineQueueRepo.clearPendingMessages(effectiveConversationId);
        }
        
        setLoadedMessages(allMsgs);
        counterpartIdRef.current = String(data.counterpart.id);

        getJobRequestForConversation(effectiveConversationId)
          .then(jr => setActiveJobRequest(jr ? {
            id: jr.id,
            title: jr.title,
            description: jr.description,
            consumerName: `${data.counterpart.name} ${data.counterpart.surname}`,
          } : null))
          .catch(() => setActiveJobRequest(null));
      })
      .catch(console.error);
  }, [selectedConsumerId, effectiveConversationId, myUserId]);

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
        if (event.message.sender_role === "provider") return;

        const newMessage = transformApiMessageToDomain(
          event.message,
          myUserId,
          counterpartIdRef.current ?? incomingConvId,
          "provider"
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
    if ((!messageInput.trim() && attachedFiles.length === 0) || !selectedConsumerId || isSending || isSendingRef.current) return;
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
      c.consumerId === selectedConsumerId 
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
          counterpartId: parseInt(selectedConsumerId),
          myUserId: session?.user?.id ?? myUserId,
          myRole: "provider",
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

  const handleContactClick = (consumerId: string) => {
    router.push(`${ROUTES.provider.messages}?consumer_id=${consumerId}`);
  };

  const handleAccept = async () => {
    if (!activeJobRequest) return;
    try {
      await acceptJobRequest(activeJobRequest.id);
      setAcceptedConversations(prev => new Set([...prev, selectedContact!.id]));
      setActiveJobRequest(null);
      setShowRequestModal(false);
    } catch (error) {
      console.error("Error accepting job request:", error);
    }
  };

  const handleReject = async () => {
    setShowRequestModal(false);
  };

  const viewMessages = allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    sentAt: msg.sentAt,
    senderId: msg.senderId,
    images: msg.images,
  }));

  const modalRequest: ProviderWorkRequest | null = activeJobRequest ? {
    id: String(activeJobRequest.id),
    conversationId: effectiveConversationId ?? "",
    clientName: activeJobRequest.consumerName,
    problemTitle: activeJobRequest.title,
    category: "",
    description: activeJobRequest.description,
    location: "",
    publishedAtLabel: "",
    unreadMessagesCount: 0,
  } : null;

  const isPending = (c: ConversationContact) => c.pending && !acceptedConversations.has(c.id);
  const contactsWithUnread = localContacts.map((c) => ({
    ...c,
    pending: isPending(c),
  }));

  return {
    selectedConsumerId,
    selectedContact,
    contactsWithUnread,
    viewMessages,
    messageInput,
    setMessageInput,
    isSending,
    attachedFiles,
    setAttachedFiles,
    expandedMessages,
    toggleMessageExpanded,
    messagesEndRef,
    handleSendMessage,
    handleContactClick,
    handleAccept,
    handleReject,
    activeJobRequest,
    showRequestModal,
    setShowRequestModal,
    modalRequest,
    isPending
  };
}
