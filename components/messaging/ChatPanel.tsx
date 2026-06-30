import { MessageSquare } from "lucide-react";
import { forwardRef } from "react";
import ChatHeader from "./ChatHeader";
import MessagesList from "./MessagesList";
import MessageInput, { MessageInputHandle } from "./MessageInput";
import { ConversationContact, Message, JobRequestInfo } from "@/domain/messaging/types";
import { t } from "@/infrastructure/i18n/translations";

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
  isLoadingJobRequest?: boolean;
  pendingBannerText?: string;
  blockInputWhenPending?: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
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
  isLoadingJobRequest,
  pendingBannerText,
  blockInputWhenPending = false,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
}, ref) => {
  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-neutral/30">
        <div className="text-center">
          <MessageSquare className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400">{t.messaging.selectContact}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="chat-panel" role="region" aria-label={t.messaging.chatPanelLabel} className="flex-1 flex flex-col bg-brand-neutral/30 min-h-0">
      <ChatHeader
        providerName={selectedContact.providerName}
        providerSurname={selectedContact.providerSurname}
        pending={selectedContact.pending}
        jobRequest={jobRequest}
        isLoadingJobRequest={isLoadingJobRequest}
        onAccept={onAccept}
        profilePhotoUrl={selectedContact.profilePhotoUrl}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <MessagesList
          messages={messages}
          expandedMessages={expandedMessages}
          onToggleExpand={onToggleExpand}
          messagesEndRef={messagesEndRef}
          showPendingBanner={selectedContact.pending}
          myUserId={myUserId}
          pendingBannerText={pendingBannerText}
          conversationId={selectedContact.id}
        />
        {blockInputWhenPending && selectedContact.pending ? (
          <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
            <p className="text-center text-[13px] text-slate-400 py-2">
              {t.messaging.acceptRequired}
            </p>
          </div>
        ) : (
          <MessageInput
            ref={ref}
            value={messageInput}
            onChange={onMessageInputChange}
            onSend={onSendMessage}
            disabled={isSending}
            attachedFiles={attachedFiles}
            onAttachFiles={onAttachFiles}
            onRemoveFile={onRemoveFile}
          />
        )}
      </div>
    </div>
  );
});

ChatPanel.displayName = "ChatPanel";
export default ChatPanel;
