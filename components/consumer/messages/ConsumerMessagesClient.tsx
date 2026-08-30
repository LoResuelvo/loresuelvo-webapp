"use client";

import { useState } from "react";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import ConsumerMessagesView from "@/components/consumer/messages/ConsumerMessagesView";
import ChatPanel from "@/components/messaging/chat/ChatPanel";
import ChatHeader from "@/components/messaging/chat/ChatHeader";
import MessagesList from "@/components/messaging/chat/MessagesList";
import MessageInput from "@/components/messaging/chat/MessageInput";
import ResizableContactsSidebar from "@/components/messaging/contacts/ResizableContactsSidebar";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { AuthSession } from "@/infrastructure/auth/types";
import { ConsumerConversationContact as ConversationContact, ServiceProposalSummary } from "@/domain/messaging/types";
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
    handleSendAudio,
    handleContactClick,
    viewMessages,
    contactsWithUnread,
  } = useConsumerMessages(session, contacts, myUserId);

  const [selectedProposalModal, setSelectedProposalModal] = useState<ServiceProposalSummary | null>(null);

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <ConsumerMessagesView
          isChatActive={!!selectedProviderId}
          sidebar={
            <ResizableContactsSidebar
              contacts={contactsWithUnread}
              selectedProviderId={selectedProviderId}
              onContactClick={handleContactClick}
              className={selectedProviderId ? "hidden md:flex" : "flex w-full md:w-auto"}
            />
          }
          chat={
            selectedContact ? (
              <ChatPanel
                header={
                  <ChatHeader
                    contact={{
                      name: selectedContact.providerName,
                      surname: selectedContact.providerSurname,
                      photoUrl: selectedContact.profilePhotoUrl,
                    }}
                    conversationState={{
                      pending: isConversationPending,
                      isLoadingJobRequest: activeJobRequest === undefined,
                    }}
                    jobRequest={activeJobRequest}
                    serviceProposal={activeServiceProposal || undefined}
                    actions={{
                      onOpenProposal: activeServiceProposal
                        ? () => setSelectedProposalModal(activeServiceProposal)
                        : undefined,
                    }}
                  />
                }
                footer={
                  <MessageInput
                    ref={inputRef}
                    value={messageInput}
                    onChange={setMessageInput}
                    onSend={handleSendMessage}
                    onSendAudio={handleSendAudio}
                    disabled={isSending}
                    attachedFiles={attachedFiles}
                    onAttachFiles={(files) => setAttachedFiles(prev => [...prev, ...files].slice(0, 5))}
                    onRemoveFile={(idx) => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                  />
                }
              >
                <MessagesList
                  messages={viewMessages}
                  myUserId={myUserId}
                  conversationId={selectedContact.id}
                  messagesEndRef={messagesEndRef}
                  pendingBanner={{
                    show: isConversationPending,
                  }}
                  expandState={{
                    expandedMessages,
                    onToggleExpand: toggleMessageExpanded,
                  }}
                  proposals={{
                    serviceProposal: activeServiceProposal || undefined,
                    onOpenProposal: (proposal) => setSelectedProposalModal(proposal),
                  }}
                />
              </ChatPanel>
            ) : (
              <ChatPanel />
            )
          }
        />
      </div>

      {selectedProposalModal && (
        <ServiceProposalDetailModal
          proposal={selectedProposalModal}
          onClose={() => setSelectedProposalModal(null)}
        />
      )}
    </div>
  );
}

