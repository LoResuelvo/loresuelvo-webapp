import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { shouldShowExpandButton } from "@/lib/text-utils";
import InfoBanner from "./InfoBanner";

import { Message } from "@/domain/messaging/types";

const sharedScrollPositions = new Map<string, number>();

interface MessagesListProps {
  messages: Message[];
  expandedMessages: Set<string>;
  onToggleExpand: (messageId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  showPendingBanner: boolean;
  myUserId: string;
  pendingBannerText?: string;
  conversationId?: string;
}

export default function MessagesList({
  messages,
  expandedMessages,
  onToggleExpand,
  messagesEndRef,
  showPendingBanner,
  myUserId,
  pendingBannerText = t.messaging.pendingBannerDefault,
  conversationId,
}: MessagesListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevCountRef = useRef(messages.length);
  const scrollPositionsRef = useRef<Map<string, number>>(sharedScrollPositions);
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const isMessageExpanded = (id: string) => expandedMessages.has(id);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessage(false);

    if (conversationIdRef.current) {
      scrollPositionsRef.current.set(conversationIdRef.current, el.scrollTop);
    }
  };

  useLayoutEffect(() => {
    if (conversationId && containerRef.current) {
      const saved = scrollPositionsRef.current.get(conversationId);
      if (saved !== undefined) {
        containerRef.current.scrollTop = saved;
      }
    }
  }, [conversationId, messages]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const latest = messages[messages.length - 1];
      const isFromMe = latest != null && String(latest.senderId) === String(myUserId);

      if (isFromMe || isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setHasNewMessage(false);
      } else {
        setHasNewMessage(true);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, isAtBottom, messagesEndRef, myUserId]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-testid="messages-list"
      className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative"
    >
      {showPendingBanner && (
        <InfoBanner tone="info">{pendingBannerText}</InfoBanner>
      )}

      {messages.map((msg) => {
        const isExpanded = isMessageExpanded(msg.id);
        const showExpandButton = shouldShowExpandButton(msg.content || "");
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
            images={msg.images}
          />
        );
      })}
      <div ref={messagesEndRef} />

      {hasNewMessage && (
        <Button
          data-testid="new-message-alert"
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setHasNewMessage(false);
          }}
          className="sticky bottom-2 mx-auto bg-brand-primary text-white px-4 py-2 rounded-full shadow-[0_4px_12px_rgba(26,43,72,0.12)] text-sm font-semibold z-10 h-auto"
        >
          {t.messaging.newMessageAlert}
        </Button>
      )}
    </div>
  );
}