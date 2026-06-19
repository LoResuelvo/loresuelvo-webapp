"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { createApiAssistantClient } from "@/infrastructure/repositories/api-assistant-client";
import { ApiAiChatRepository } from "@/infrastructure/repositories/api-ai-chat-repository";
import type { AiConversationContact } from "@/domain/messaging/types";
import { ROUTES } from "@/lib/routes";
import { Bot } from "lucide-react";

interface AiDiagnosisChatWrapperProps {
  initialConversations: AiConversationContact[];
  accessToken?: string;
}

export default function AiDiagnosisChatWrapper({ initialConversations, accessToken }: AiDiagnosisChatWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [conversations] = useState<AiConversationContact[]>(initialConversations);

  const assistantClient = createApiAssistantClient(accessToken);
  const chatRepository = new ApiAiChatRepository(accessToken);

  const handleConversationClick = (id: string) => {
    router.push(`${ROUTES.consumer.aiMessages}?id=${id}`);
  };

  const handleNewChat = () => {
    router.push(ROUTES.consumer.aiMessages);
  };

  return (
    <>
      <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            <Bot className="w-5 h-5" />
            Nuevo chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No hay conversaciones aún
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" role="list" aria-label="Conversaciones con IA">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleConversationClick(conv.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selectedId === conv.id ? "bg-brand-secondary/10" : ""
                    }`}
                  >
                    <h3 className="font-semibold text-sm text-brand-primary truncate">
                      {conv.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {conv.lastMessage || "Sin mensajes"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="max-w-3xl w-full mx-auto p-6">
          <AiDiagnosisChat client={assistantClient} chatRepository={chatRepository} conversationId={selectedId} />
        </div>
      </div>
    </>
  );
}
