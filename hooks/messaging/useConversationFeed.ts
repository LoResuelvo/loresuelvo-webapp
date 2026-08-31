import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/infrastructure/websocket";
import type { ConversationDetailInfo, Message } from "@/domain/messaging/types";
import type { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import { formatToLocalShortDateTime, transformApiMessageToDomain } from "@/infrastructure/repositories/messaging/conversation-mapper";
import { formatMessagePreview } from "@/lib/messaging/message-preview";
import {
  appendMessageIfMissing,
  combineVisibleMessages,
  mergeConversationMessages,
  removeMessage,
  replaceOptimisticMessage,
  updateContactPreview,
} from "./message-state";
import type { BaseConversationContact } from "./types";

interface UseConversationFeedConfig<TContact extends BaseConversationContact> {
  contacts: TContact[];
  selectedCounterpartId: string | null;
  effectiveConversationId: string | undefined;
  myUserId: string;
  myRole: "consumer" | "provider";
  getConversationDetail: (id: string) => Promise<ConversationDetailInfo>;
  offlineQueueRepository: OfflineQueueRepository;
  onConversationLoaded?: (conversationId: string, data: ConversationDetailInfo) => void;
  onNewIncomingMessage?: (message: Message) => void;
}

/**
 * This hook owns the three feed synchronization processes: contact updates, realtime events,
 * and initial conversation loading. Its size keeps those related processes together while
 * the message transitions themselves remain pure in message-state.ts.
 */
export function useConversationFeed<TContact extends BaseConversationContact>({
  contacts,
  selectedCounterpartId,
  effectiveConversationId,
  myUserId,
  myRole,
  getConversationDetail,
  offlineQueueRepository,
  onConversationLoaded,
  onNewIncomingMessage,
}: UseConversationFeedConfig<TContact>) {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [localContacts, setLocalContacts] = useState<TContact[]>(contacts);
  const conversationWasJustCreatedRef = useRef(false);
  const effectiveConversationIdRef = useRef(effectiveConversationId);
  const counterpartIdRef = useRef<string | null>(null);
  const onConversationLoadedRef = useRef(onConversationLoaded);
  const onNewIncomingMessageRef = useRef(onNewIncomingMessage);
  const { subscribe, resetUnread } = useWebSocket();

  effectiveConversationIdRef.current = effectiveConversationId;
  onConversationLoadedRef.current = onConversationLoaded;
  onNewIncomingMessageRef.current = onNewIncomingMessage;

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (event.type !== "conversation.message.created") return;

      const incomingConversationId = String(event.conversation_id);
      const previewText = formatMessagePreview(event.message);
      const sentAt = formatToLocalShortDateTime(event.message.created_on);

      setLocalContacts((current) =>
        updateContactPreview(current, incomingConversationId, previewText, sentAt, (contact) =>
          contact.id.replace("conv-", "")
        )
      );

      if (incomingConversationId !== effectiveConversationIdRef.current || event.message.sender_role === myRole) return;

      const message = transformApiMessageToDomain(
        event.message,
        myUserId,
        counterpartIdRef.current ?? incomingConversationId,
        myRole
      );
      setLoadedMessages((current) => appendMessageIfMissing(current, message));
      onNewIncomingMessageRef.current?.(message);
      resetUnread();
    });

    return unsubscribe;
  }, [myRole, myUserId, resetUnread, subscribe]);

  useEffect(() => {
    if (!selectedCounterpartId || !effectiveConversationId || !/^\d+$/.test(effectiveConversationId)) return;
    if (conversationWasJustCreatedRef.current) {
      conversationWasJustCreatedRef.current = false;
      return;
    }

    getConversationDetail(effectiveConversationId)
      .then((data) => {
        const remoteMessages = data.messages.map((message) => ({
          ...message,
          id: String(message.id),
          senderId: message.senderId === myRole ? myUserId : String(data.counterpart.id),
        }));
        const pendingMessages = offlineQueueRepository.loadPendingMessages(effectiveConversationId);

        setLoadedMessages((current) =>
          mergeConversationMessages(remoteMessages, pendingMessages, current)
        );
        if (pendingMessages.length > 0) offlineQueueRepository.clearPendingMessages(effectiveConversationId);

        counterpartIdRef.current = String(data.counterpart.id);
        onConversationLoadedRef.current?.(effectiveConversationId, data);
      })
      .catch(console.error);
  }, [effectiveConversationId, getConversationDetail, myRole, myUserId, offlineQueueRepository, selectedCounterpartId]);

  return {
    localContacts,
    setLocalContacts,
    addLocalMessage: (message: Message) => setLocalMessages((current) => [...current, message]),
    removeLocalMessage: (messageId: string) => setLocalMessages((current) => removeMessage(current, messageId)),
    replaceLocalMessage: (optimisticMessageId: string, message: Message) =>
      setLocalMessages((current) => replaceOptimisticMessage(current, optimisticMessageId, message)),
    addLoadedMessage: (message: Message) =>
      setLoadedMessages((current) => appendMessageIfMissing(current, message)),
    viewMessages: combineVisibleMessages(loadedMessages, localMessages).map((message) => ({ ...message })),
    markConversationJustCreated: () => {
      conversationWasJustCreatedRef.current = true;
    },
  };
}
