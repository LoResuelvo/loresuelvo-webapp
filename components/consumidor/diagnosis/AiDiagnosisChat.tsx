"use client";

import { useSearchParams } from "next/navigation";
import MessageBubble from "@/app/components/messaging/MessageBubble";

interface ChatMessage {
  id: string;
  content: string;
  sentAt: string;
  senderId: string;
}

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";

const MOCK_ASSISTANT_REPLY =
  "Entiendo. ¿La pérdida ocurre de forma constante o solamente cuando utilizas la canilla?";

export default function AiDiagnosisChat() {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("mensaje")?.trim() ?? "";

  if (!initialMessage) {
    return null;
  }

  const messages: ChatMessage[] = [
    {
      id: "msg-user-1",
      content: initialMessage,
      sentAt: "Recién",
      senderId: USER_ID,
    },
    {
      id: "msg-assistant-1",
      content: MOCK_ASSISTANT_REPLY,
      sentAt: "Recién",
      senderId: ASSISTANT_ID,
    },
  ];

  return (
    <section
      aria-label="Chat con el asistente de diagnóstico"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 p-6"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          id={msg.id}
          content={msg.content}
          sentAt={msg.sentAt}
          isExpanded={false}
          showExpandButton={false}
          onToggleExpand={() => undefined}
          isOwnMessage={msg.senderId === USER_ID}
        />
      ))}
    </section>
  );
}
