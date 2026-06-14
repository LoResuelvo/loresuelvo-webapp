"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MessageBubble from "@/app/components/messaging/MessageBubble";
import {
  AssistantClient,
  createMockAssistantClient,
  DEFAULT_ASSISTANT_DELAY_MS,
} from "@/lib/diagnosis/assistant-client";

interface ChatMessage {
  id: string;
  content: string;
  sentAt: string;
  senderId: string;
}

const USER_ID = "consumer-ai-diagnosis";
const ASSISTANT_ID = "assistant-ai-diagnosis";

interface AiDiagnosisChatProps {
  client?: AssistantClient;
}

export default function AiDiagnosisChat({ client }: AiDiagnosisChatProps = {}) {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("mensaje")?.trim() ?? "";

  const [assistantReply, setAssistantReply] = useState<string | null>(null);

  const assistantClient = client ?? createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS);

  useEffect(() => {
    if (!initialMessage) {
      setAssistantReply(null);
      return;
    }
    setAssistantReply(null);
    let cancelled = false;
    assistantClient.requestReply(initialMessage).then((reply) => {
      if (!cancelled) setAssistantReply(reply);
    });
    return () => {
      cancelled = true;
    };
  }, [initialMessage, assistantClient]);

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
  ];

  if (assistantReply) {
    messages.push({
      id: "msg-assistant-1",
      content: assistantReply,
      sentAt: "Recién",
      senderId: ASSISTANT_ID,
    });
  }

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
