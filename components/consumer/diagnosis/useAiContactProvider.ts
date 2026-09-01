import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import { createAiJobRequest } from "@/application/ai-chat/create-ai-job-request";

export interface UseAiContactProviderProps {
  chatRepository?: AiChatRepository;
  effectiveConversationId?: string | null;
  jobRequestFn?: (conversationId: string, providerId: number) => Promise<unknown>;
}

export function useAiContactProvider({
  chatRepository,
  effectiveConversationId,
  jobRequestFn,
}: UseAiContactProviderProps) {
  const router = useRouter();
  const jobRequestFnRef = useRef(jobRequestFn);
  jobRequestFnRef.current = jobRequestFn;

  const handleContactProvider = useCallback(
    async (providerId: number) => {
      let result: unknown;
      if (jobRequestFnRef.current) {
        result = await jobRequestFnRef.current(effectiveConversationId ?? "", providerId);
      } else if (chatRepository && effectiveConversationId) {
        result = await createAiJobRequest(chatRepository, effectiveConversationId, providerId);
      } else {
        throw new Error("No repository or jobRequestFn provided");
      }
      const resObj =
        result && typeof result === "object" ? (result as Record<string, unknown>) : null;
      if (resObj && resObj.status === 409) {
        const err = new Error("409: Ya existe una solicitud de trabajo abierta") as Error & {
          status?: number;
        };
        err.status = 409;
        throw err;
      }
      router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
    },
    [chatRepository, effectiveConversationId, router]
  );

  return { handleContactProvider };
}
