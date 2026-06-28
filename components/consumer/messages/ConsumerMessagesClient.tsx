"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import ConsumerMessagesView from "@/components/consumer/messages/ConsumerMessagesView";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import { getConversationDetail, sendMessage, createConversation, getJobRequestForConversation } from "@/app/consumidor/mensajes/actions";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";
import { t } from "@/infrastructure/i18n/translations";
import { useWebSocket } from "@/infrastructure/websocket";

import { Message, JobRequestInfo, ConsumerConversationContact as ConversationContact } from "@/domain/messaging/types";

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
            providerProfilePhotoUrl: data.counterpart.profilePhotoUrl,
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

      if (incomingConvId === currentConvId) {
        if (event.message.sender_role === "consumer") return;

        setIsConversationPending(false);

        const newMessage: Message = {
          id: String(event.message.id),
          content: event.message.content,
          senderId: counterpartIdRef.current ?? incomingConvId,
          images: event.message.images ? event.message.images.map((img: { id: number; url: string; original_name: string }) => ({
            id: String(img.id),
            url: img.url,
            originalName: img.original_name,
          })) : undefined,
          sentAt: new Date(event.message.created_on).toLocaleString("es-AR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          }),
        };

        setLoadedMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
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

        resetUnread();
      } else {
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
        setMessageInput(messageContent || "");
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
        images: optimisticMessage.images,
      };
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
      setLoadedMessages(prev => [...prev, successfulMessage]);
      setIsSending(false);
      return;
    }

    const uploadedImageIds: string[] = [];

    try {
      if (currentFiles.length > 0) {
        for (const file of currentFiles) {
          const presigned = await getPresignedUrlAction(file.name, file.type, file.size, "conversation_message_image");
          const uploadRes = await fetch(presigned.upload_url, {
            method: "PUT",
            body: file,
            headers: presigned.headers,
          });
          if (!uploadRes.ok) throw new Error("Error al subir archivo a S3/R2");
          const confirm = await confirmUploadAction(presigned.file_id, presigned.key, file.type, file.size);
          uploadedImageIds.push(confirm.id);
        }
      }

      const response = await sendMessage(conversationIdToUse, messageContent, uploadedImageIds.length > 0 ? uploadedImageIds : undefined) as { id?: number; created_on?: string; content?: string, images?: { id: number; url: string; original_name: string }[] };

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
        images: optimisticMessage.images,
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
          images: response.images ? response.images.map((img: { id: number; url: string; original_name: string }) => ({
            id: String(img.id),
            url: img.url,
            originalName: img.original_name
          })) : successfulMessage.images,
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
        ...optimisticMessage,
        id: `pending-${tempId}`,
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
    images: msg.images,
  }));

  const contactsWithUnread = localContacts.map((c) => ({
    ...c,
    pending: c.providerId === selectedProviderId ? isConversationPending : c.pending,
  }));

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <ConsumerMessagesView
          ref={inputRef}
          contacts={contactsWithUnread}
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
          attachedFiles={attachedFiles}
          onAttachFiles={(files) => setAttachedFiles(prev => [...prev, ...files].slice(0, 5))}
          onRemoveFile={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
        />
      </div>
    </div>
  );
}