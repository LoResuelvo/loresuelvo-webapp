import { Suspense } from "react";
import Sidebar from "@/components/consumer/Sidebar";
import ConsumerHeader from "@/components/consumer/home/ConsumerHeader";
import AiDiagnosisChatWrapper from "@/components/consumer/diagnosis/AiDiagnosisChatWrapper";
import { getAuthService } from "@/infrastructure/auth";
import { ApiAiChatRepository } from "@/infrastructure/repositories/api-ai-chat-repository";
import { getAiConversations } from "@/application/ai-chat/get-ai-conversations";
import type { AiConversationContact } from "@/domain/messaging/types";

export default async function ConsumerAiMessagesPage() {
  const session = await getAuthService().getSession();

  let conversations: AiConversationContact[] = [];
  try {
    const repository = new ApiAiChatRepository(session?.accessToken);
    conversations = await getAiConversations(repository);
  } catch (error) {
    console.error("Failed to fetch AI conversations:", error);
  }

  return (
    <div className="min-h-screen bg-brand-neutral/30 flex font-sans text-brand-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConsumerHeader session={session} />
        <main className="flex-1 flex min-h-0">
          <Suspense fallback={null}>
            <AiDiagnosisChatWrapper
              initialConversations={conversations}
              accessToken={session?.accessToken}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
