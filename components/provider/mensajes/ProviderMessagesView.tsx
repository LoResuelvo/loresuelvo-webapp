import { RefObject } from "react";
import { ChatPanel } from "@/app/components/messaging/MessagesLayout";
import ContactList from "@/app/components/messaging/ContactList";

interface ConversationContact {
  id: string;
  consumerId: string;
  consumerName: string;
  consumerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
  senderId?: string;
}

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
}

export default function ProviderMessagesView({
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
}: ProviderMessagesViewProps) {
  return (
    <main className="flex-1 flex min-h-0">
      <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-full">
        <ContactList
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
        />
      </div>

      <ChatPanel
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
      />
    </main>
  );
}