"use client";

import { useRef, useState } from "react";
import ProviderSidebar from "@/components/provider/home/layout/ProviderSidebar";
import ProviderHeader from "@/components/provider/home/layout/ProviderHeader";
import ProviderMessagesView from "@/components/provider/messages/ProviderMessagesView";
import ChatPanel from "@/components/messaging/chat/ChatPanel";
import ChatHeader from "@/components/messaging/chat/ChatHeader";
import MessagesList from "@/components/messaging/chat/MessagesList";
import MessageInput, { type MessageInputHandle } from "@/components/messaging/chat/MessageInput";
import ResizableContactsSidebar from "@/components/messaging/contacts/ResizableContactsSidebar";
import ServiceProposalDetailModal from "@/components/messaging/proposals/ServiceProposalDetailModal";
import { AuthSession } from "@/infrastructure/auth/types";
import RequestDetailModal from "@/components/provider/home/work-requests/RequestDetailModal";
import { ProviderConversationContact as ConversationContact, ServiceProposalSummary } from "@/domain/messaging/types";
import { useProviderMessages } from "./useProviderMessages";
import { t } from "@/infrastructure/i18n/translations";
import { ServiceProposalModal } from "@/components/provider/messages/ServiceProposalModal";
import { createServiceProposal } from "@/app/prestador/mensajes/actions";

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
    handleSendAudio,
    handleContactClick,
    handleAccept,
    handleReject,
    activeJobRequest,
    activeServiceProposal,
    showRequestModal,
    setShowRequestModal,
    modalRequest,
    isPending,
    showServiceProposalModal,
    setShowServiceProposalModal,
  } = useProviderMessages(session, contacts, myUserId);

  const inputRef = useRef<MessageInputHandle>(null);
  const [selectedProposalModal, setSelectedProposalModal] = useState<ServiceProposalSummary | null>(null);
  const [proposalDrafts, setProposalDrafts] = useState<Record<number, { amount: string; scheduledDate: string; scheduledTime: string; description: string }>>({});

  const isContactPending = selectedContact ? isPending(selectedContact) : false;

  return (
    <div className="h-screen flex overflow-hidden bg-brand-neutral/30 font-sans text-brand-primary">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ProviderHeader session={session} />
        <ProviderMessagesView
          isChatActive={!!selectedConsumerId}
          sidebar={
            <ResizableContactsSidebar
              contacts={contactsWithUnread.map(c => ({
                id: c.id,
                providerId: c.consumerId,
                providerName: c.consumerName,
                providerSurname: c.consumerSurname,
                lastMessage: c.lastMessage,
                lastMessageAt: c.lastMessageAt,
                pending: c.pending,
              }))}
              selectedProviderId={selectedConsumerId}
              onContactClick={handleContactClick}
              className={selectedConsumerId ? "hidden md:flex" : "flex w-full md:w-auto"}
            />
          }
          chat={
            selectedContact ? (
              <ChatPanel
                header={
                  <ChatHeader
                    contact={{
                      name: selectedContact.consumerName,
                      surname: selectedContact.consumerSurname,
                    }}
                    conversationState={{
                      pending: isContactPending,
                      isProvider: true,
                      isLoadingJobRequest: activeJobRequest === undefined,
                    }}
                    jobRequest={activeJobRequest ? {
                      title: activeJobRequest.title,
                      description: activeJobRequest.description,
                      providerName: selectedContact.consumerName,
                      providerSurname: selectedContact.consumerSurname,
                      images: activeJobRequest.images,
                    } : activeJobRequest}
                    serviceProposal={activeServiceProposal || undefined}
                    actions={{
                      onAccept: activeJobRequest ? () => setShowRequestModal(true) : undefined,
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
                    onOpenServiceProposal={
                      !isContactPending
                        ? () => setShowServiceProposalModal(true)
                        : undefined
                    }
                    disableAudio={isContactPending}
                  />
                }
              >
                <MessagesList
                  messages={viewMessages}
                  myUserId={myUserId}
                  conversationId={selectedContact.id}
                  messagesEndRef={messagesEndRef}
                  pendingBanner={{
                    show: isContactPending,
                    text: t.messaging.pendingBannerProvider,
                  }}
                  expandState={{
                    expandedMessages,
                    onToggleExpand: toggleMessageExpanded,
                  }}
                  proposals={{
                    serviceProposal: activeServiceProposal || undefined,
                    onOpenProposal: (proposal) => setSelectedProposalModal(proposal),
                    isProvider: true,
                  }}
                />
              </ChatPanel>
            ) : (
              <ChatPanel />
            )
          }
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

      {selectedContact && (
        <ServiceProposalModal
          open={showServiceProposalModal}
          onClose={() => setShowServiceProposalModal(false)}
          consumerId={parseInt(selectedContact.consumerId)}
          draft={proposalDrafts[parseInt(selectedContact.consumerId)]}
          onDraftChange={(draft) => {
            setProposalDrafts(prev => ({
              ...prev,
              [parseInt(selectedContact.consumerId)]: draft,
            }));
          }}
          onSubmit={async (input) => {
            const res = await createServiceProposal(input);
            if (!res.success) {
              throw new Error(res.error);
            }
            setProposalDrafts(prev => {
              const next = { ...prev };
              delete next[parseInt(selectedContact.consumerId)];
              return next;
            });
          }}
        />
      )}

      {selectedProposalModal && (
        <ServiceProposalDetailModal
          proposal={selectedProposalModal}
          onClose={() => setSelectedProposalModal(null)}
        />
      )}
    </div>
  );
}

