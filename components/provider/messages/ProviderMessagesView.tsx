import { RefObject, forwardRef } from "react";
import ChatPanel from "@/components/messaging/ChatPanel";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import ResizableContactsSidebar from "@/components/messaging/ResizableContactsSidebar";

import { Message, ProviderConversationContact as ConversationContact } from "@/domain/messaging/types";
import { cn } from "@/lib/utils";

interface ProviderMessagesViewProps {
  contacts: ConversationContact[];
  selectedContact: ConversationContact | null;
  selectedConsumerId: string | null;
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  onContactClick: (consumerId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  onAccept?: () => void;
  myUserId: string;
  isLoadingJobRequest?: boolean;
  pendingBannerText?: string;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onOpenServiceProposal?: () => void;
  className?: string;
}

const ProviderMessagesView = forwardRef<MessageInputHandle, ProviderMessagesViewProps>(({
  contacts,
  selectedContact,
  selectedConsumerId,
  messages,
  expandedMessages,
  onToggleExpand,
  onContactClick,
  messagesEndRef,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  isSending,
  onAccept,
  myUserId,
  isLoadingJobRequest,
  pendingBannerText,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  onOpenServiceProposal,
  className,
}, ref) => {
  const isChatActive = !!selectedConsumerId;

  return (
    <main className={cn("flex-1 flex min-h-0", className)}>
      <ResizableContactsSidebar
        contacts={contacts.map(c => ({
          id: c.id,
          providerId: c.consumerId,
          providerName: c.consumerName,
          providerSurname: c.consumerSurname,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          pending: c.pending,
        }))}
        selectedProviderId={selectedConsumerId}
        onContactClick={onContactClick}
        className={`${isChatActive ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}
      />

      <div className={`${isChatActive ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        <ChatPanel
          ref={ref}
          selectedContact={selectedContact ? {
            id: selectedContact.id,
            providerId: selectedContact.consumerId,
            providerName: selectedContact.consumerName,
            providerSurname: selectedContact.consumerSurname,
            lastMessage: selectedContact.lastMessage,
            lastMessageAt: selectedContact.lastMessageAt,
            pending: selectedContact.pending,
          } : null}
          messages={messages}
          expandedMessages={expandedMessages}
          onToggleExpand={onToggleExpand}
          messagesEndRef={messagesEndRef}
          messageInput={messageInput}
          onMessageInputChange={onMessageInputChange}
          onSendMessage={onSendMessage}
          isSending={isSending}
          onAccept={onAccept}
          myUserId={myUserId}
          isLoadingJobRequest={isLoadingJobRequest}
          pendingBannerText={pendingBannerText}
          blockInputWhenPending={false}
          attachedFiles={attachedFiles}
          onAttachFiles={onAttachFiles}
          onRemoveFile={onRemoveFile}
          onOpenServiceProposal={onOpenServiceProposal}
        />
      </div>
    </main>
  );
});

ProviderMessagesView.displayName = "ProviderMessagesView";

export default ProviderMessagesView;