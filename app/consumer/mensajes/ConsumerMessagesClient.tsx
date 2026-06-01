"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import ConsumerMessagesView from "@/components/consumer/mensajes/ConsumerMessagesView";
import { AuthSession } from "@/lib/auth/types";
import { ROUTES } from "@/lib/routes";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sentAt: string;
}

interface ConversationMessage {
  id: number;
  sender_role: string;
  content: string;
  created_on: string;
}

interface ConversationDetail {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
  };
  messages: ConversationMessage[];
  updated_on: string;
}

interface SendMessageResponse {
  id: number;
  conversation_id: number;
  sender_role: string;
  content: string;
  created_on: string;
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
}

const API_BASE_URL = "/api";

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

export default function ConsumerMessagesClient({ session, contacts = [] }: ConsumerMessagesClientProps) {
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
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);

  const selectedContact = contacts.find(c => c.providerId === selectedProviderId);

  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

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

  const isMessageExpanded = (messageId: string) => expandedMessages.has(messageId);

  const shouldShowExpandButton = (content: string) => {
    const lines = content.split("\n").length;
    const approxLineHeight = 20;
    const maxCharsPerLine = 40;
    const totalChars = content.length;
    const estimatedLines = Math.ceil(totalChars / maxCharsPerLine) + lines;
    return estimatedLines > 5;
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

    const accessToken = session?.accessToken;

    fetch(`${API_BASE_URL}/conversations/${effectiveConversationId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then(res => res.json())
      .then((data: ConversationDetail) => {
        const messages: Message[] = data.messages.map(msg => ({
          id: String(msg.id),
          content: msg.content,
          senderId: msg.sender_role === "consumer" ? "consumer-001" : String(data.counterpart.id),
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
      })
      .catch(console.error);
  }, [selectedProviderId, effectiveConversationId, session?.accessToken]);

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
      senderId: session?.user?.id ?? "consumer-001",
      sentAt: "Ahora",
    };

    setLocalMessages(prev => [...prev, optimisticMessage]);
    setMessageInput("");

    const accessToken = session?.accessToken;
    const currentConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

    let conversationIdToUse = currentConversationId;
    let conversationJustCreated = false;

    if (!conversationIdToUse || !/^\d+$/.test(conversationIdToUse)) {
      try {
        const createResponse = await fetch(`${API_BASE_URL}/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            provider_id: parseInt(selectedProviderId),
            content: messageContent,
          }),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create conversation: ${createResponse.status}`);
        }

        const createData = await createResponse.json();
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
        senderId: session?.user?.id ?? "consumer-001",
        sentAt,
      };
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => [...prev, successfulMessage]);
      setIsSending(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationIdToUse}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ content: messageContent }),
      });

      const sentAt = new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const successfulMessage: Message = {
        id: tempId,
        content: messageContent,
        senderId: session?.user?.id ?? "consumer-001",
        sentAt,
      };

      if (response.ok) {
        const contentLength = response.headers.get("Content-Length");
        const hasBody = contentLength && parseInt(contentLength) > 0;

        if (hasBody) {
          try {
            const data: SendMessageResponse = await response.json();
            if (data && data.id) {
              const serverSentAt = new Date(data.created_on).toLocaleString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              const updatedMessage: Message = {
                id: String(data.id),
                content: data.content,
                senderId: session?.user?.id ?? "consumer-001",
                sentAt: serverSentAt,
              };
              setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
              setLoadedMessages(prev => [...prev, updatedMessage]);
              setIsSending(false);
              return;
            }
          } catch {
            // Response was not valid JSON, keep optimistic message
          }
        }
        setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
        setLoadedMessages(prev => [...prev, successfulMessage]);
      } else {
        throw new Error(`Failed to send message: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setLocalMessages(prev =>
        prev.map(msg => msg.id === tempId ? { ...msg, id: `pending-${tempId}` } : msg)
      );
      const pendingMsg: Message = {
        id: `pending-${tempId}`,
        content: messageContent,
        senderId: session?.user?.id ?? "consumer-001",
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
  }));

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <ConsumerMessagesView
          contacts={contacts}
          selectedContact={selectedContact ?? null}
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
        />
      </div>
    </div>
  );
}
