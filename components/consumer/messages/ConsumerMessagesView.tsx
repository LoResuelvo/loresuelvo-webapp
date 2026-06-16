import { RefObject, forwardRef } from "react";
import { ChatPanel } from "@/components/messaging/MessagesLayout";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import ContactList from "@/components/messaging/ContactList";
import { Message, JobRequestInfo, ConsumerConversationContact as ConversationContact } from "@/lib/messaging/types";

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
}, ref) => {
  return (
    <main className="flex-1 flex min-h-0">
      <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-full">
        <ContactList
          contacts={contacts}
          selectedProviderId={selectedProviderId}
          onContactClick={onContactClick}
        />
      </div>

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
      />
    </main>
  );
});

ConsumerMessagesView.displayName = "ConsumerMessagesView";

export default ConsumerMessagesView;