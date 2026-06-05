import { MessageSquare } from "lucide-react";
import { forwardRef } from "react";
import ContactList from "./ContactList";
import ChatHeader, { type JobRequestInfo } from "./ChatHeader";
import MessagesList from "./MessagesList";
import MessageInput, { MessageInputHandle } from "./MessageInput";

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

interface MessagesLayoutProps {
  contacts: ConversationContact[];
  selectedProviderId: string | null;
  onContactClick: (providerId: string) => void;
}

export default function MessagesLayout({
  contacts,
  selectedProviderId,
  onContactClick,
}: MessagesLayoutProps) {
  return (
    <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-full">
      <ContactList
        contacts={contacts}
        selectedProviderId={selectedProviderId}
        onContactClick={onContactClick}
      />
    </div>
  );
}

export const ChatPanel = forwardRef<MessageInputHandle, {
  selectedContact: ConversationContact | null;
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  onAccept?: () => void;
  myUserId: string;
  jobRequest?: JobRequestInfo | null;
}>(({
  selectedContact,
  messages,
  expandedMessages,
  onToggleExpand,
  messagesEndRef,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  isSending,
  onAccept,
  myUserId,
  jobRequest,
}, ref) => {
  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-neutral/30">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400">Selecciona un contacto para ver la conversación</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="chat-panel" role="region" aria-label="Detalle de conversación" className="flex-1 flex flex-col bg-brand-neutral/30 min-h-0">
      <ChatHeader
        providerName={selectedContact.providerName}
        providerSurname={selectedContact.providerSurname}
        pending={selectedContact.pending}
        jobRequest={jobRequest}
        onAccept={onAccept}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <MessagesList
          messages={messages}
          expandedMessages={expandedMessages}
          onToggleExpand={onToggleExpand}
          messagesEndRef={messagesEndRef}
          showPendingBanner={selectedContact.pending}
          myUserId={myUserId}
        />
        <MessageInput
          ref={ref}
          value={messageInput}
          onChange={onMessageInputChange}
          onSend={onSendMessage}
          disabled={isSending}
        />
      </div>
    </div>
  );
});

ChatPanel.displayName = "ChatPanel";