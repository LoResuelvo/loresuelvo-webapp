"use client";

import { useRef } from "react";
import ProviderSidebar from "@/components/provider/home/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/ProviderHeader";
import ProviderMessagesView from "@/components/provider/messages/ProviderMessagesView";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import { AuthSession } from "@/infrastructure/auth/types";
import RequestDetailModal from "@/components/provider/home/RequestDetailModal";
import { ProviderConversationContact as ConversationContact } from "@/domain/messaging/types";
import { useProviderMessages } from "./useProviderMessages";
import { t } from "@/infrastructure/i18n/translations";

interface ProviderMessagesClientProps {
  session: AuthSession | null;
  contacts?: ConversationContact[];
  myUserId: string;
}

export default function ProviderMessagesClient({ session, contacts = [], myUserId }: ProviderMessagesClientProps) {
  const {
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
  } = useProviderMessages(session, contacts, myUserId);

  const inputRef = useRef<MessageInputHandle>(null);

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
          isLoadingJobRequest={activeJobRequest === undefined}
          pendingBannerText={t.messaging.pendingBannerProvider}
          attachedFiles={attachedFiles}
          onAttachFiles={(files) => setAttachedFiles(prev => [...prev, ...files].slice(0, 5))}
          onRemoveFile={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
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