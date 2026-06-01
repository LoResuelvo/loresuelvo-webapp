"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageSquare, User, Info, Send } from "lucide-react";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
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
  const isSendingRef = useRef(false);
  const justCreatedRef = useRef(false);

  const selectedContact = contacts.find(c => c.providerId === selectedProviderId);

  const effectiveConversationId = activeConversationId || selectedContact?.id?.replace("conv-", "");

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

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 flex">
          <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-[calc(100vh-80px)]">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-[18px] font-bold text-brand-primary">Mensajes</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-500">No tienes conversaciones aún</p>
                  <p className="text-slate-400 text-sm mt-2">Inicia un chat con un prestador desde la búsqueda</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact.providerId)}
                    className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
                      selectedProviderId === contact.providerId ? "bg-brand-secondary/10" : ""
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[14px] text-brand-primary truncate">
                          {contact.providerName} {contact.providerSurname}
                        </p>
                        <p className="text-[11px] text-slate-400">{contact.lastMessageAt}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.pending && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
                        Pendiente
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-brand-neutral/30">
            {selectedContact ? (
              <>
                <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-primary">
                      {selectedContact.providerName} {selectedContact.providerSurname}
                    </p>
                    {selectedContact.pending && (
                      <p className="text-[11px] text-amber-600">Esperando aceptación</p>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                  <div className="flex-1 flex flex-col gap-4">
                    {selectedContact.pending && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-blue-700 text-[14px]">
                          Solicitud de contacto enviada. El prestador aún no aceptó la conversación.
                        </p>
                      </div>
                    )}

                    {allMessages.map((msg) => (
                      <div key={msg.id} className="flex justify-end">
                        <div className="bg-brand-primary text-white rounded-2xl rounded-tr-sm p-4 max-w-md">
                          <p className="text-[14px]">
                            {msg.content}
                          </p>
                          <p className="text-[11px] text-white/70 mt-2">{msg.sentAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-secondary/40"
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                      className="px-5 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-400">Selecciona un contacto para ver la conversación</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
