import { RefObject, forwardRef } from "react";
import ChatPanel from "@/components/messaging/ChatPanel";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import ContactList from "@/components/messaging/ContactList";
import { Message, JobRequestInfo, ConsumerConversationContact as ConversationContact } from "@/domain/messaging/types";
import { cn } from "@/lib/utils";

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
  isSending: boolean;
  myUserId: string;
  jobRequest?: JobRequestInfo | null;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
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
  isSending,
  myUserId,
  jobRequest,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  className,
}, ref) => {
  const isChatActive = !!selectedProviderId;

  return (
    <main className={cn("flex-1 flex min-h-0", className)}>
      <div className={`${isChatActive ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r border-slate-200 bg-white flex-col h-full`}>
        <ContactList
          contacts={contacts}
          selectedProviderId={selectedProviderId}
          onContactClick={onContactClick}
        />
      </div>

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
          isSending={isSending}
          myUserId={myUserId}
          jobRequest={jobRequest}
          attachedFiles={attachedFiles}
          onAttachFiles={onAttachFiles}
          onRemoveFile={onRemoveFile}
        />
      </div>
    </main>
  );
});

ConsumerMessagesView.displayName = "ConsumerMessagesView";

export default ConsumerMessagesView;