"use client";

import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import ConsumerMessagesView from "@/components/consumer/messages/ConsumerMessagesView";
import { AuthSession } from "@/infrastructure/auth/types";
import { ConsumerConversationContact as ConversationContact } from "@/domain/messaging/types";
import { useConsumerMessages } from "./useConsumerMessages";

interface ConsumerMessagesClientProps {
  session: AuthSession | null;
  contacts?: ConversationContact[];
  myUserId: string;
}

export default function ConsumerMessagesClient({ session, contacts = [], myUserId }: ConsumerMessagesClientProps) {
  const {
    messageInput,
    setMessageInput,
    attachedFiles,
    setAttachedFiles,
    isSending,
    expandedMessages,
    messagesEndRef,
    inputRef,
    activeJobRequest,
    activeServiceProposal,
    isConversationPending,
    selectedContact,
    selectedProviderId,
    toggleMessageExpanded,
    handleSendMessage,
    handleContactClick,
    viewMessages,
    contactsWithUnread,
  } = useConsumerMessages(session, contacts, myUserId);

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
          isLoadingJobRequest={activeJobRequest === undefined}
          attachedFiles={attachedFiles}
          onAttachFiles={(files) => setAttachedFiles(prev => [...prev, ...files].slice(0, 5))}
          onRemoveFile={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
          activeServiceProposal={activeServiceProposal || undefined}
        />
      </div>
    </div>
  );
}