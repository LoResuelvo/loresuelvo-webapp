"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import MessageBubble from "@/app/components/messaging/MessageBubble";
import MessageInput from "@/app/components/messaging/MessageInput";
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

  const assistantClient = useMemo(
    () => client ?? createMockAssistantClient(DEFAULT_ASSISTANT_DELAY_MS),
    [client],
  );

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

  const isProcessing = assistantReply === null;

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
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col"
    >
      <div className="flex flex-col gap-4 p-6">
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

        {isProcessing && (
          <div
            role="status"
            aria-label="Asistente escribiendo"
            className="flex justify-start"
          >
            <div className="rounded-2xl bg-white border border-slate-200 rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="text-[13px]">Asistente escribiendo…</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200">
        <MessageInput
          value=""
          onChange={() => undefined}
          onSend={() => undefined}
          disabled={isProcessing}
        />
      </div>
    </section>
  );
}
