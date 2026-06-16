import { RefObject, forwardRef } from "react";
import { ChatPanel } from "@/components/messaging/MessagesLayout";
import type { MessageInputHandle } from "@/components/messaging/MessageInput";
import ContactList from "@/components/messaging/ContactList";

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
  onAccept?: () => void;
  myUserId: string;
  pendingBannerText?: string;
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
  pendingBannerText,
}, ref) => {
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
        pendingBannerText={pendingBannerText}
        blockInputWhenPending={true}
      />
    </main>
  );
});

ProviderMessagesView.displayName = "ProviderMessagesView";

export default ProviderMessagesView;