import { getAuthService } from "@/lib/auth";
import { conversationsClient, type ApiConversation } from "@/lib/conversations-client";
import ProviderMessagesClient from "@/components/provider/messages/ProviderMessagesClient";

interface ConversationContact {
  id: string;
  consumerId: string;
  consumerName: string;
  consumerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
}

function transformApiConversation(apiConv: ApiConversation): ConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    consumerId: String(apiConv.counterpart.id),
    consumerName: apiConv.counterpart.name,
    consumerSurname: apiConv.counterpart.surname,
    lastMessage: apiConv.last_message?.content || "",
    lastMessageAt: apiConv.last_message?.created_on
      ? new Date(apiConv.last_message.created_on).toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    pending: apiConv.status === "pending",
  };
}

export default async function ProviderMessagesPage() {
  const session = await getAuthService().getSession();

  let contacts: ConversationContact[] = [];

  try {
    const apiContacts = await conversationsClient.getConversations();
    contacts = apiContacts.map(transformApiConversation);
  } catch (error) {
    console.log("Could not fetch conversations:", error);
  }

  return <ProviderMessagesClient session={session} contacts={contacts} myUserId={session?.user?.id ?? "provider-001"} />;
}