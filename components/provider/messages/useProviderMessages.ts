import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, acceptJobRequest, getJobRequestForConversation, createConversation, sendMessage, sendAudioMessage as sendAudioMessageAction, getServiceProposalsAction } from "@/app/prestador/mensajes/actions";
import { t } from "@/infrastructure/i18n/translations";
import { useWebSocket } from "@/infrastructure/websocket";
import type { ProviderWorkRequest } from "@/domain/provider/types";
import { Message, ProviderConversationContact as ConversationContact, ServiceProposalSummary } from "@/domain/messaging/types";
import { ClientConversationRepository, ClientFileRepository } from "@/infrastructure/repositories/client-repositories";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/local-offline-queue-repository";
import { sendMessageWithAttachments } from "@/application/messaging/send-message-with-attachments";
import { AudioUploadError, sendAudioMessage as sendAudioMessageUseCase, type AudioUploadFailureStage } from "@/application/messaging/send-audio-message";
import { transformApiMessageToDomain, formatToLocalShortDateTime } from "@/infrastructure/repositories/conversation-mapper";
import { clearDraft, loadDraft, saveDraft, type DraftFileMeta } from "@/lib/message-drafts";
import { useClock } from "@/hooks/useClock";
import { formatMessagePreview } from "@/lib/message-preview";

function fileToMeta(file: File): DraftFileMeta {
  return { name: file.name, size: file.size, type: file.type };
}

function metaToFile(meta: DraftFileMeta): File {
  return new File([new Blob([])], meta.name, { type: meta.type });
}

const conversationRepository = new ClientConversationRepository({ create: createConversation, sendMessage, sendAudioMessage: sendAudioMessageAction });
const fileRepository = new ClientFileRepository();
const offlineQueueRepo = new LocalOfflineQueueRepository();

let lastProviderConsumerId: string | null = null;

export function useProviderMessages(session: AuthSession | null, contacts: ConversationContact[], myUserId: string) {
  const { now } = useClock();
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
  const [activeJobRequest, setActiveJobRequest] = useState<{ id: number; title: string; description: string; consumerName: string; images?: { id: string; url: string; originalName: string; }[] } | null | undefined>(undefined);
  const [showRequestModal, setShowRequestModal] = useState(false);
   const [showServiceProposalModal, setShowServiceProposalModal] = useState(false);
  const [activeServiceProposal, setActiveServiceProposal] = useState<ServiceProposalSummary | null>(null);
  const [localContacts, setLocalContacts] = useState<ConversationContact[]>(contacts);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);
  const justLoadedRef = useRef(false);

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = contacts.find(c => c.consumerId === selectedConsumerId);
  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

  const effectiveConvIdRef = useRef(effectiveConversationId);
  effectiveConvIdRef.current = effectiveConversationId;
  const counterpartIdRef = useRef<string | null>(null);

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

    setActiveJobRequest(undefined);
    getConversationDetail(effectiveConversationId)
      .then((data) => {
        const messages: Message[] = data.messages.map(msg => ({
          ...msg,
          id: String(msg.id),
          senderId: msg.senderId === "provider" ? myUserId : String(data.counterpart.id),
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

        getJobRequestForConversation(effectiveConversationId)
          .then(jr => setActiveJobRequest(jr ? {
            id: jr.id,
            title: jr.title,
            description: jr.description,
            consumerName: `${data.counterpart.name} ${data.counterpart.surname}`,
            images: jr.images,
          } : null))
          .catch(() => setActiveJobRequest(null));

        getServiceProposalsAction()
          .then(proposals => {
            const prop = proposals.find(p => p.conversationId === Number(effectiveConversationId));
            setActiveServiceProposal(prop || null);
          })
          .catch(() => setActiveServiceProposal(null));
      })
      .catch(console.error);
  }, [selectedConsumerId, effectiveConversationId, myUserId]);

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
    
    const tempId = `local-${now().getTime()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: session?.user?.id ?? myUserId,
      sentAt: "Ahora",
      createdOn: now().toISOString(),
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

  const handleSendAudio = async (file: File): Promise<boolean | AudioUploadFailureStage> => {
    if (!selectedConsumerId || isSending || isSendingRef.current) return false;

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

    setLocalMessages(prev => [...prev, optimisticMessage]);
    setLocalContacts(prev => prev.map(c =>
      c.consumerId === selectedConsumerId
        ? { ...c, lastMessage: "🎤 Audio", lastMessageAt: "Ahora" }
        : c
    ));

    try {
      const { message } = await sendAudioMessageUseCase(conversationRepository, fileRepository, {
        conversationId: currentConversationId,
        counterpartId: Number(selectedConsumerId),
        myUserId: session?.user?.id ?? myUserId,
        myRole: "provider",
        file,
      });
      setLocalMessages(prev => [...prev.filter(msg => msg.id !== tempId), message]);
      URL.revokeObjectURL(optimisticUrl);
      return true;
    } catch (error) {
      console.error("Error sending audio message:", error);
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      URL.revokeObjectURL(optimisticUrl);
      return error instanceof AudioUploadError ? error.stage : "send";
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

  const viewMessages = allMessages.map(msg => ({ ...msg }));

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
    images: activeJobRequest.images,
  } : null;

  const isPending = (c: ConversationContact) => c.pending && !acceptedConversations.has(c.id);
  const contactsWithUnread = localContacts.map((c) => ({
    ...c,
    pending: isPending(c),
  }));

  const handleServiceProposalSuccess = () => {
    setShowServiceProposalModal(false);
  };

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
    handleSendAudio,
    handleContactClick,
    handleAccept,
    handleReject,
    activeJobRequest,
    activeServiceProposal,
    showRequestModal,
    setShowRequestModal,
    modalRequest,
    isPending,
    showServiceProposalModal,
    setShowServiceProposalModal,
    handleServiceProposalSuccess,
  };
}
