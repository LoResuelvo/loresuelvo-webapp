"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AiDiagnosisChat from "@/components/consumer/diagnosis/AiDiagnosisChat";
import {
  createAiConversationAction,
  sendAiMessageAction,
  getAiConversationByIdAction,
  createAiJobRequestAction,
  getAiConversationsAction,
} from "@/app/consumidor/mensajes-ia/actions";
import type { AiConversationContact } from "@/domain/messaging/types";
import { ROUTES } from "@/lib/routes";
import ContactItem from "@/components/messaging/contacts/ContactItem";
import { Bot } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { Button } from "@/components/ui/button";
import { logger } from "@/infrastructure/logging/logger";
import { parseAiDiagnosisParams } from "./ai-diagnosis-params";

interface AiDiagnosisChatWrapperProps {
  initialConversations: AiConversationContact[];
}

export default function AiDiagnosisChatWrapper({
  initialConversations: initial,
}: AiDiagnosisChatWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedId, isChatActive } = parseAiDiagnosisParams(searchParams);
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

  const chatRepository = useMemo(
    () => ({
      create: async (content: string, imageFileIds?: string[]) => {
        const res = await createAiConversationAction(content, imageFileIds);
        if (!res.success) throw new Error(res.error);
        return res.data;
      },
      sendMessage: async (
        conversationId: string,
        content: string,
        imageFileIds?: string[]
      ) => {
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
            return {
              status: 409,
              error: res.error,
            } as unknown as {
              id: number;
              conversationId: number;
              title: string;
              description: string;
            };
          }
          throw new Error(res.error);
        }
        return res.data;
      },
      getConversations: async () => [],
    }),
    []
  );

  const handleConversationClick = (id: string) => {
    router.push(`${ROUTES.consumer.aiMessages}?id=${id}`);
  };

  const handleNewChat = () => {
    router.push(`${ROUTES.consumer.aiMessages}?new=true`);
  };

  return (
    <>
      <div
        className={`${
          isChatActive ? "hidden md:flex" : "flex"
        } w-full md:w-[320px] md:shrink-0 border-r border-slate-200 bg-white flex-col h-full`}
      >
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="mb-3 text-subtitle font-bold text-brand-primary">{t.aiDiagnosis.conversationsList}</h2>
          <Button
            variant="brand"
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            <Bot className="w-5 h-5" aria-hidden="true" />
            {t.aiDiagnosis.newChat}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {t.aiDiagnosis.noConversations}
            </div>
          ) : (
            <div
              className="divide-y divide-slate-100"
              role="list"
              aria-label={t.aiDiagnosis.conversationsList}
            >
              {conversations.map((conv) => (
                <ContactItem
                  key={conv.id}
                  id={conv.id}
                  providerId={conv.id}
                  providerName={conv.title}
                  providerSurname=""
                  lastMessage={conv.lastMessage || t.aiDiagnosis.noMessages}
                  lastMessageAt={conv.lastMessageAt}
                  pending={false}
                  isSelected={selectedId === conv.id}
                  onClick={handleConversationClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={`${
          isChatActive ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 min-h-0`}
      >
        <AiDiagnosisChat
          chatRepository={chatRepository}
          conversationId={selectedId}
        />
      </div>
    </>
  );
}
