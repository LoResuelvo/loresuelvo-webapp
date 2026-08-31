import { useRef, useState } from "react";
import { useClock } from "@/hooks/useClock";
import { toggleExpandedMessage, updateContactPreview } from "./message-state";
import { useConversationDraft } from "./useConversationDraft";
import { useConversationFeed } from "./useConversationFeed";
import { useMessageOutbox } from "./useMessageOutbox";
import type { BaseConversationContact, UseMessagingCoreConfig, UseMessagingCoreReturn } from "./types";

export type { BaseConversationContact, UseMessagingCoreConfig, UseMessagingCoreReturn } from "./types";

export function useMessagingCore<TContact extends BaseConversationContact>({
  contacts,
  selectedCounterpartId,
  getCounterpartIdFromContact,
  ...config
}: UseMessagingCoreConfig<TContact>): UseMessagingCoreReturn<TContact> {
  const { now } = useClock();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedContact = contacts.find((contact) => getCounterpartIdFromContact(contact) === selectedCounterpartId);
  const effectiveConversationId = activeConversationId || selectedContact?.id.replace("conv-", "");
  const currentConversationId = activeConversationId || selectedContact?.id.replace("conv-", "");

  const draft = useConversationDraft({ conversationId: effectiveConversationId, isSending });
  const feed = useConversationFeed({
    contacts,
    selectedCounterpartId,
    effectiveConversationId,
    getCounterpartIdFromContact,
    ...config,
  });
  const outbox = useMessageOutbox({
    ...config,
    selectedCounterpartId,
    currentConversationId,
    effectiveConversationId,
    messageInput: draft.messageInput,
    attachedFiles: draft.attachedFiles,
    isSending,
    setMessageInput: draft.setMessageInput,
    setAttachedFiles: draft.setAttachedFiles,
    setIsSending,
    setActiveConversationId,
    now,
    ...feed,
    updateContactPreview: (lastMessage) =>
      feed.setLocalContacts((current) =>
        updateContactPreview(
          current,
          selectedCounterpartId ?? "",
          lastMessage,
          "Ahora",
          getCounterpartIdFromContact
        )
      ),
    clearConversationDraft: draft.clearConversationDraft,
  });

  return {
    ...draft,
    isSending,
    expandedMessages,
    toggleMessageExpanded: (messageId) =>
      setExpandedMessages((current) => toggleExpandedMessage(current, messageId)),
    messagesEndRef,
    viewMessages: feed.viewMessages,
    localContacts: feed.localContacts,
    setLocalContacts: feed.setLocalContacts,
    selectedContact,
    effectiveConversationId,
    activeConversationId,
    setActiveConversationId,
    handleSendMessage: outbox.handleSendMessage,
    handleSendAudio: outbox.handleSendAudio,
  };
}
