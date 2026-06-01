import { RefObject } from "react";
import { ChatPanel } from "@/app/components/messaging/MessagesLayout";
import ContactList from "@/app/components/messaging/ContactList";

interface ConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
}

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
}

export default function ConsumerMessagesView({
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
}: ConsumerMessagesViewProps) {
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
        selectedContact={selectedContact}
        messages={messages}
        expandedMessages={expandedMessages}
        onToggleExpand={onToggleExpand}
        messagesEndRef={messagesEndRef}
        messageInput={messageInput}
        onMessageInputChange={onMessageInputChange}
        onSendMessage={onSendMessage}
        isSending={isSending}
      />
    </main>
  );
}