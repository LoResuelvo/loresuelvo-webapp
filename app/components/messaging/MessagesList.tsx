import { RefObject, useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

interface Message {
  id: string;
  content: string;
  sentAt: string;
  senderId?: string;
}

interface MessagesListProps {
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  showPendingBanner: boolean;
  myUserId: string;
  pendingBannerText?: string;
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
  myUserId,
  pendingBannerText = "Solicitud de contacto enviada. El prestador aún no aceptó la conversación.",
}: MessagesListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevCountRef = useRef(messages.length);

  const isMessageExpanded = (id: string) => expandedMessages.has(id);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessage(false);
  };

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        setHasNewMessage(true);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isAtBottom, messagesEndRef]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-testid="messages-list"
      className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative"
    >
      {showPendingBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-blue-700 text-[14px]">
            {pendingBannerText}
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const isExpanded = isMessageExpanded(msg.id);
        const showExpandButton = shouldShowExpandButton(msg.content);
        const isOwnMessage = String(msg.senderId) === myUserId;
        return (
          <MessageBubble
            key={msg.id}
            id={msg.id}
            content={msg.content}
            sentAt={msg.sentAt}
            isExpanded={isExpanded}
            showExpandButton={showExpandButton}
            onToggleExpand={onToggleExpand}
            isOwnMessage={isOwnMessage}
          />
        );
      })}
      <div ref={messagesEndRef} />

      {hasNewMessage && (
        <button
          data-testid="new-message-alert"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setHasNewMessage(false);
          }}
          className="sticky bottom-2 mx-auto bg-brand-primary text-white px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(26,43,72,0.12)] text-sm font-semibold z-10 animate-bounce"
        >
          ↓ Mensaje nuevo
        </button>
      )}
    </div>
  );
}