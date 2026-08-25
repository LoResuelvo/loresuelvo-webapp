import { RefObject, forwardRef } from "react";
import ChatPanel from "@/components/messaging/ChatPanel";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import ResizableContactsSidebar from "@/components/messaging/ResizableContactsSidebar";
import { Message, JobRequestInfo, ConsumerConversationContact as ConversationContact, ServiceProposalSummary } from "@/domain/messaging/types";
import { cn } from "@/lib/utils";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";

interface ConsumerMessagesViewProps {
  contacts: ConversationContact[];
  selectedContact: ConversationContact | null;
  selectedProviderId: string | null;
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  onContactClick: (providerId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendAudio?: (file: File) => Promise<boolean | AudioUploadFailureStage> | boolean | AudioUploadFailureStage;
  isSending: boolean;
  myUserId: string;
  jobRequest?: JobRequestInfo | null;
  isLoadingJobRequest?: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  activeServiceProposal?: ServiceProposalSummary;
  className?: string;
}

const ConsumerMessagesView = forwardRef<MessageInputHandle, ConsumerMessagesViewProps>(({
  contacts,
  selectedContact,
  selectedProviderId,
  messages,
  expandedMessages,
  onToggleExpand,
  onContactClick,
  messagesEndRef,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onSendAudio,
  isSending,
  myUserId,
  jobRequest,
  isLoadingJobRequest,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  activeServiceProposal,
  className,
}, ref) => {
  const isChatActive = !!selectedProviderId;

  return (
    <main className={cn("flex-1 flex min-h-0", className)}>
      <ResizableContactsSidebar
        contacts={contacts}
        selectedProviderId={selectedProviderId}
        onContactClick={onContactClick}
        className={`${isChatActive ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}
      />

      <div className={`${isChatActive ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        <ChatPanel
          ref={ref}
          selectedContact={selectedContact}
          messages={messages}
          expandedMessages={expandedMessages}
          onToggleExpand={onToggleExpand}
          messagesEndRef={messagesEndRef}
          messageInput={messageInput}
          onMessageInputChange={onMessageInputChange}
          onSendMessage={onSendMessage}
          onSendAudio={onSendAudio}
          isSending={isSending}
          myUserId={myUserId}
          jobRequest={jobRequest}
          isLoadingJobRequest={isLoadingJobRequest}
          attachedFiles={attachedFiles}
          onAttachFiles={onAttachFiles}
          onRemoveFile={onRemoveFile}
          serviceProposal={activeServiceProposal}
        />
      </div>
    </main>
  );
});

ConsumerMessagesView.displayName = "ConsumerMessagesView";

export default ConsumerMessagesView;
