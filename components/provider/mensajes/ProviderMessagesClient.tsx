"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProviderSidebar from "@/components/provider/home/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/ProviderHeader";
import ProviderMessagesView from "@/components/provider/mensajes/ProviderMessagesView";
import type { MessageInputHandle } from "@/app/components/messaging/MessageInput";
import { AuthSession } from "@/lib/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, sendMessage, createConversation, acceptJobRequest, getJobRequestForConversation } from "./actions";
import { useWebSocket } from "@/lib/websocket";
import RequestDetailModal from "@/components/provider/home/RequestDetailModal";
import type { ProviderWorkRequest } from "@/lib/provider-home/types";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

interface ConversationContact {
  id: string;
  consumerId: string;
  consumerName: string;
  consumerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
}

interface ProviderMessagesClientProps {
  session: AuthSession | null;
  contacts?: ConversationContact[];
  myUserId: string;
}

function getLocalStorageKey(conversationId: string): string {
  return `pending_messages_${conversationId}`;
}

function savePendingMessages(conversationId: string, messages: Message[]): void {
  try {
    localStorage.setItem(getLocalStorageKey(conversationId), JSON.stringify(messages));
  } catch {
    // localStorage not available
  }
}

function loadPendingMessages(conversationId: string): Message[] {
  try {
    const stored = localStorage.getItem(getLocalStorageKey(conversationId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function clearPendingMessages(conversationId: string): void {
  try {
    localStorage.removeItem(getLocalStorageKey(conversationId));
  } catch {
    // localStorage not available
  }
}

export default function ProviderMessagesClient({ session, contacts = [], myUserId }: ProviderMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedConsumerId = searchParams.get("consumer_id");
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [acceptedConversations, setAcceptedConversations] = useState<Set<string>>(new Set());
  const [activeJobRequest, setActiveJobRequest] = useState<{ id: number; title: string; description: string; consumerName: string } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [localContacts, setLocalContacts] = useState<ConversationContact[]>(contacts);

  // Keep localContacts in sync when server-side contacts prop changes
  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const selectedContact = contacts.find(c => c.consumerId === selectedConsumerId);

  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

  // Ref para que el subscribe siempre lea el valor actual sin necesitar re-suscribirse
  const effectiveConvIdRef = useRef(effectiveConversationId);
  effectiveConvIdRef.current = effectiveConversationId;

  // El ID numérico real del counterpart (del backend)
  const counterpartIdRef = useRef<string | null>(null);

  const { subscribe, resetUnread } = useWebSocket();

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
    if (!selectedConsumerId) return;

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
          senderId: msg.sender_role === "provider" ? myUserId : String(data.counterpart.id),
          sentAt: new Date(msg.created_on).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        const pendingMessages = loadPendingMessages(effectiveConversationId);
        const allMessages = [...messages];
        pendingMessages.forEach(pending => {
          if (!allMessages.some(m => m.id === pending.id || m.content === pending.content)) {
            allMessages.push(pending);
          }
        });
        if (pendingMessages.length > 0) {
          clearPendingMessages(effectiveConversationId);
        }
        setLoadedMessages(allMessages);
        counterpartIdRef.current = String(data.counterpart.id);

        // Fetch the linked job request to get its real ID
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

      if (incomingConvId === currentConvId) {
        // Active conversation: render the message in real time
        if (event.message.sender_role === "provider") return;

        const newMessage: Message = {
          id: String(event.message.id),
          content: event.message.content,
          senderId: counterpartIdRef.current ?? incomingConvId,
          sentAt: new Date(event.message.created_on).toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          }),
        };

        setLoadedMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        resetUnread();
      } else {
        // Non-active conversation: increment unread count and update preview
        setUnreadCounts((prev) => {
          const next = new Map(prev);
          next.set(incomingConvId, (next.get(incomingConvId) ?? 0) + 1);
          return next;
        });

        const previewText = event.message.content.length > 40
          ? event.message.content.slice(0, 40) + "…"
          : event.message.content;

        setLocalContacts((prev) =>
          prev.map((c) => {
            const cId = c.id.replace("conv-", "");
            return cId === incomingConvId
              ? { ...c, lastMessage: previewText, lastMessageAt: new Date(event.message.created_on).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) }
              : c;
          })
        );
      }
    });

    return unsubscribe;
  }, [subscribe, resetUnread]);


  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConsumerId || isSending || isSendingRef.current) return;
    isSendingRef.current = true;

    const messageContent = messageInput;
    setIsSending(true);
    const tempId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: session?.user?.id ?? myUserId,
      sentAt: "Ahora",
    };

    setLocalMessages(prev => [...prev, optimisticMessage]);
    setMessageInput("");
    const interval = setInterval(() => {
      if (typeof document === 'undefined') return;
      const inputEl = document.querySelector<HTMLInputElement>('[placeholder="Escribe un mensaje..."]');
      if (inputEl && !inputEl.disabled) {
        clearInterval(interval);
        inputEl.focus();
      }
    }, 1);

    const currentConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

    let conversationIdToUse = currentConversationId;
    let conversationJustCreated = false;

    if (!conversationIdToUse || !/^\d+$/.test(conversationIdToUse)) {
      try {
        const createData = await createConversation(parseInt(selectedConsumerId), messageContent) as { id: number };
        conversationIdToUse = String(createData.id);
        setActiveConversationId(conversationIdToUse);
        justCreatedRef.current = true;
        conversationJustCreated = true;
      } catch (error) {
        console.error("Error creating conversation:", error);
        setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
        setMessageInput(messageContent);
        setIsSending(false);
        return;
      }
    }

    if (conversationJustCreated) {
      const sentAt = new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const successfulMessage: Message = {
        id: tempId,
        content: messageContent,
        senderId: session?.user?.id ?? myUserId,
        sentAt,
      };
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => [...prev, successfulMessage]);
      setIsSending(false);
      return;
    }

    try {
      const response = await sendMessage(conversationIdToUse, messageContent) as { id?: number; created_on?: string; content?: string };

      const sentAt = new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const successfulMessage: Message = {
        id: tempId,
        content: messageContent,
        senderId: session?.user?.id ?? myUserId,
        sentAt,
      };

      if (response && response.id) {
        const serverSentAt = response.created_on ? new Date(response.created_on).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }) : sentAt;
        const updatedMessage: Message = {
          id: String(response.id),
          content: response.content || messageContent,
          senderId: session?.user?.id ?? myUserId,
          sentAt: serverSentAt,
        };
        setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
        setLoadedMessages(prev => [...prev, updatedMessage]);
        setIsSending(false);
        return;
      }
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => [...prev, successfulMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setLocalMessages(prev =>
        prev.map(msg => msg.id === tempId ? { ...msg, id: `pending-${tempId}` } : msg)
      );
      const pendingMsg: Message = {
        id: `pending-${tempId}`,
        content: messageContent,
        senderId: session?.user?.id ?? myUserId,
        sentAt: new Date().toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setLoadedMessages(prev => [...prev, pendingMsg]);
      const existingPending = loadPendingMessages(conversationIdToUse);
      savePendingMessages(conversationIdToUse, [...existingPending, pendingMsg]);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const handleContactClick = (consumerId: string) => {
    // Find the conversation ID for this consumer and clear its unread count
    const contact = localContacts.find((c) => c.consumerId === consumerId);
    if (contact) {
      const convId = contact.id.replace("conv-", "");
      setUnreadCounts((prev) => {
        const next = new Map(prev);
        next.delete(convId);
        return next;
      });
    }
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
    // TODO: implementar rechazo cuando el endpoint esté disponible
    setShowRequestModal(false);
  };

  const viewMessages = allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    sentAt: msg.sentAt,
    senderId: msg.senderId,
  }));

  // Build the ProviderWorkRequest shape expected by RequestDetailModal
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
    unreadCount: unreadCounts.get(c.id.replace("conv-", "")) ?? 0,
  }));

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <ProviderMessagesView
          ref={inputRef}
          contacts={contactsWithUnread}
          selectedContact={selectedContact ? { ...selectedContact, pending: isPending(selectedContact) } : null}
          selectedConsumerId={selectedConsumerId}
          messages={viewMessages}
          expandedMessages={expandedMessages}
          onToggleExpand={toggleMessageExpanded}
          onContactClick={handleContactClick}
          messagesEndRef={messagesEndRef}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          onAccept={activeJobRequest ? () => setShowRequestModal(true) : undefined}
          myUserId={myUserId}
          pendingBannerText="Solicitud de trabajo aún no aceptada. Para comunicarte con el consumidor primero tenés que aceptarla."
        />
      </div>

      {showRequestModal && modalRequest && (
        <RequestDetailModal
          request={modalRequest}
          onClose={() => setShowRequestModal(false)}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  );
}