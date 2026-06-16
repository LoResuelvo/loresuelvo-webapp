import { getAuthService } from "@/infrastructure/auth";
import ProviderMessagesClient from "@/components/provider/messages/ProviderMessagesClient";
import { getProviderConversations } from "@/application/messaging/get-conversations";
import { ApiConversationRepository } from "@/infrastructure/repositories/api-conversation-repository";

export default async function ProviderMessagesPage() {
  const session = await getAuthService().getSession();
  const conversationRepo = new ApiConversationRepository();
  const contacts = await getProviderConversations(conversationRepo);

  return <ProviderMessagesClient session={session} contacts={contacts} myUserId={session?.user?.id ?? "provider-001"} />;
}