"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import ConsumerMessagesView from "@/components/consumer/mensajes/ConsumerMessagesView";
import type { MessageInputHandle } from "@/app/components/messaging/MessageInput";
import { AuthSession } from "@/lib/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, sendMessage, createConversation, getJobRequestForConversation } from "./actions";
import { useWebSocket } from "@/lib/websocket";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

interface JobRequestInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
}

interface ConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
  messages?: Message[];
}

interface ConsumerMessagesClientProps {
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

export default function ConsumerMessagesClient({ session, contacts = [], myUserId }: ConsumerMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProviderId = searchParams.get("provider_id");
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MessageInputHandle>(null);
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);
  const [activeJobRequest, setActiveJobRequest] = useState<JobRequestInfo | null>(null);
  const [isConversationPending, setIsConversationPending] = useState<boolean>(false);

  const selectedContact = contacts.find(c => c.providerId === selectedProviderId);

  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

  const effectiveConvIdRef = useRef(effectiveConversationId);
  effectiveConvIdRef.current = effectiveConversationId;

  const counterpartIdRef = useRef<string | null>(null);

  const { subscribe, resetUnread } = useWebSocket();

  // Sync local pending state whenever the selected contact changes
  useEffect(() => {
    setIsConversationPending(selectedContact?.pending ?? false);
  }, [selectedContact?.id]);

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
          senderId: msg.sender_role === "consumer" ? myUserId : String(data.counterpart.id),
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

        getJobRequestForConversation(effectiveConversationId)
          .then(jr => setActiveJobRequest(jr ? {
            title: jr.title,
            description: jr.description,
            providerName: data.counterpart.name,
            providerSurname: data.counterpart.surname,
          } : null))
          .catch(() => setActiveJobRequest(null));
      })
      .catch(console.error);
  }, [selectedProviderId, effectiveConversationId, myUserId]);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type !== "conversation.message.created") return;

      const currentConvId = effectiveConvIdRef.current;
      if (!currentConvId) return;

      if (String(event.conversation_id) === currentConvId) {
        if (event.message.sender_role === "consumer") return;

        // Provider sent a message → conversation was accepted
        setIsConversationPending(false);

        const newMessage: Message = {
          id: String(event.message.id),
          content: event.message.content,

          senderId: counterpartIdRef.current ?? String(event.conversation_id),
          sentAt: new Date(event.message.created_on).toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          }),
        };

        setLoadedMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });

        resetUnread();
      }
    });

    return unsubscribe;
  }, [subscribe, resetUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, loadedMessages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedProviderId || isSending || isSendingRef.current) return;
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
        const createData = await createConversation(parseInt(selectedProviderId), messageContent) as { id: number };
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

  const handleContactClick = (providerId: string) => {
    router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
  };

  const viewMessages = allMessages.map(msg => ({
    id: msg.id,
    content: msg.content,
    sentAt: msg.sentAt,
    senderId: msg.senderId,
  }));

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <ConsumerMessagesView
          ref={inputRef}
          contacts={contacts.map(c =>
            c.providerId === selectedProviderId
              ? { ...c, pending: isConversationPending }
              : c
          )}
          selectedContact={selectedContact ? { ...selectedContact, pending: isConversationPending } : null}
          selectedProviderId={selectedProviderId}
          messages={viewMessages}
          expandedMessages={expandedMessages}
          onToggleExpand={toggleMessageExpanded}
          onContactClick={handleContactClick}
          messagesEndRef={messagesEndRef}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          myUserId={myUserId}
          jobRequest={activeJobRequest}
        />
      </div>
    </div>
  );
}