import { RefObject } from "react";
import MessageBubble from "./MessageBubble";

interface Message {
  id: string;
  content: string;
  sentAt: string;
}

interface MessagesListProps {
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  showPendingBanner: boolean;
}

function shouldShowExpandButton(content: string): boolean {
  const lines = content.split("\n").length;
  const maxCharsPerLine = 40;
  const totalChars = content.length;
  const estimatedLines = Math.ceil(totalChars / maxCharsPerLine) + lines;
  return estimatedLines > 5;
}

export default function MessagesList({
  messages,
  expandedMessages,
  onToggleExpand,
  messagesEndRef,
  showPendingBanner,
}: MessagesListProps) {
  const isMessageExpanded = (id: string) => expandedMessages.has(id);

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
      {showPendingBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-blue-700 text-[14px]">
            Solicitud de contacto enviada. El prestador aún no aceptó la conversación.
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const isExpanded = isMessageExpanded(msg.id);
        const showExpandButton = shouldShowExpandButton(msg.content);
        return (
          <MessageBubble
            key={msg.id}
            id={msg.id}
            content={msg.content}
            sentAt={msg.sentAt}
            isExpanded={isExpanded}
            showExpandButton={showExpandButton}
            onToggleExpand={onToggleExpand}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}