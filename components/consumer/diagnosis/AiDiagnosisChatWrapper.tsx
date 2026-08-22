"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import { createApiAssistantClient } from "@/infrastructure/repositories/api-assistant-client";
import { createAiConversationAction, sendAiMessageAction, getAiConversationByIdAction, createAiJobRequestAction, getAiConversationsAction } from "@/app/consumidor/mensajes-ia/actions";
import type { AiConversationContact } from "@/domain/messaging/types";
import { ROUTES } from "@/lib/routes";
import { Bot } from "lucide-react";

interface AiDiagnosisChatWrapperProps {
  initialConversations: AiConversationContact[];
}

import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
import { logger } from "@/infrastructure/logging/logger";

export default function AiDiagnosisChatWrapper({ initialConversations: initial }: AiDiagnosisChatWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const [conversations, setConversations] = useState<AiConversationContact[]>(initial);

  useEffect(() => {
    if (initial.length > 0 && !selectedId) return;
    getAiConversationsAction()
      .then((res) => {
        if (res.success) {
          setConversations(res.data);
        }
      })
      .catch((err) => logger.debug("Failed to fetch conversations:", { err }));
  }, [selectedId, initial.length]);

  const assistantClient = useMemo(() => createApiAssistantClient(), []);
  const chatRepository = useMemo(() => ({
    create: async (content: string, imageFileIds?: string[]) => {
      const res = await createAiConversationAction(content, imageFileIds);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    sendMessage: async (conversationId: string, content: string, imageFileIds?: string[]) => {
      const res = await sendAiMessageAction(conversationId, content, imageFileIds);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    getById: async (id: string) => {
      const res = await getAiConversationByIdAction(id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    createJobRequest: async (conversationId: string, providerId: number) => {
      const res = await createAiJobRequestAction(conversationId, providerId);
      if (!res.success) {
        if (res.statusCode === 409 || res.error.includes("Ya existe")) {
          return { status: 409, error: res.error } as unknown as { id: number; conversationId: number; title: string; description: string };
        }
        throw new Error(res.error);
      }
      return res.data;
    },
    getConversations: async () => []
  }), []);

  const handleConversationClick = (id: string) => {
    router.push(`${ROUTES.consumer.aiMessages}?id=${id}`);
  };

  const handleNewChat = () => {
    router.push(`${ROUTES.consumer.aiMessages}?new=true`);
  };

  const isChatActive = !!selectedId || searchParams.get("new") === "true" || searchParams.get("pending") === "1";

  return (
    <>
      <div className={`${isChatActive ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] border-r border-slate-200 bg-white flex-col h-full`}>
        <div className="p-4 border-b border-slate-200">
          <Button
            variant="brand"
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            <Bot className="w-5 h-5" />
            {t.aiDiagnosis.newChat}
          </Button>
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
                        <p className="font-semibold text-body text-brand-primary truncate">
                          {conv.title}
                        </p>
                        <p className="text-caption text-slate-400">{conv.lastMessageAt}</p>
                      </div>
                      <p className="text-small text-slate-500 truncate mt-0.5">
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
