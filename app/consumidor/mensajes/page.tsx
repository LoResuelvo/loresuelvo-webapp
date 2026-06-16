import { getAuthService } from "@/infrastructure/auth";
import ConsumerMessagesClient from "@/components/consumer/messages/ConsumerMessagesClient";
import { getConsumerConversations } from "@/application/messaging/get-conversations";
import { ApiConversationRepository } from "@/infrastructure/repositories/api-conversation-repository";

interface PageProps {
  searchParams: Promise<{ provider_id?: string; name?: string; surname?: string }>;
}

export default async function ConsumerMessagesPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;

  const conversationRepo = new ApiConversationRepository();
  const contacts = await getConsumerConversations(conversationRepo);


  if (params.provider_id) {
    const existingContact = contacts.find(c => c.providerId === params.provider_id);
    if (!existingContact) {
      contacts.unshift({
        id: `pending-${params.provider_id}`,
        providerId: params.provider_id,
        providerName: params.name || "Carlos",
        providerSurname: params.surname || "Méndez",
        lastMessage: "",
        lastMessageAt: "",
        pending: true,
      });
    }
  }

  return <ConsumerMessagesClient session={session} contacts={contacts} myUserId={session?.user?.id ?? "consumer-001"} />;
}