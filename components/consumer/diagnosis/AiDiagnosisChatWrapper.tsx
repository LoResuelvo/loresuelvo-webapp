"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { createApiAssistantClient } from "@/infrastructure/repositories/api-assistant-client";
import { createAiConversationAction, sendAiMessageAction, getAiConversationByIdAction } from "@/app/consumidor/mensajes-ia/actions";
import type { AiConversationContact } from "@/domain/messaging/types";
import { ROUTES } from "@/lib/routes";
import { Bot } from "lucide-react";

interface AiDiagnosisChatWrapperProps {
  initialConversations: AiConversationContact[];
}

import { t } from "@/infrastructure/i18n/translations";

export default function AiDiagnosisChatWrapper({ initialConversations: conversations }: AiDiagnosisChatWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const assistantClient = useMemo(() => createApiAssistantClient(), []);
  const chatRepository = useMemo(() => ({
    create: createAiConversationAction,
    sendMessage: sendAiMessageAction,
    getById: getAiConversationByIdAction,
    getConversations: async () => []
  }), []);

  const handleConversationClick = (id: string) => {
    router.push(`${ROUTES.consumer.aiMessages}?id=${id}`);
  };

  const handleNewChat = () => {
    router.push(`${ROUTES.consumer.aiMessages}?new=true`);
  };

  const isChatActive = selectedId || searchParams.get("new") === "true";

  return (
    <>
      <div className={`${isChatActive ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r border-slate-200 bg-white flex-col h-full`}>
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            <Bot className="w-5 h-5" />
            {t.aiDiagnosis.newChat}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              {t.aiDiagnosis.noConversations}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" role="list" aria-label={t.aiDiagnosis.conversationsList}>
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleConversationClick(conv.id)}
                    className={`chat-list-item w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
                      selectedId === conv.id ? "bg-brand-secondary/10" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[14px] text-brand-primary truncate">
                          {conv.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{conv.lastMessageAt}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate mt-0.5">
                        {conv.lastMessage || t.aiDiagnosis.noMessages}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`${isChatActive ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        <AiDiagnosisChat client={assistantClient} chatRepository={chatRepository} conversationId={selectedId} />
      </div>
    </>
  );
}
