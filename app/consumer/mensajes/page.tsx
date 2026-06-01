import { getAuthService } from "@/lib/auth";
import { api } from "@/lib/api/base-client";
import ConsumerMessagesClient from "./ConsumerMessagesClient";

interface ApiConversation {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name: string;
  };
  last_message?: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  };
  updated_on: string;
}

interface ConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
  lastMessage: string;
  lastMessageAt: string;
  pending: boolean;
}

interface PageProps {
  searchParams: Promise<{ provider_id?: string; name?: string; surname?: string }>;
}

function transformApiConversation(apiConv: ApiConversation): ConversationContact {
  return {
    id: `conv-${apiConv.id}`,
    providerId: String(apiConv.counterpart.id),
    providerName: apiConv.counterpart.name,
    providerSurname: apiConv.counterpart.surname,
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

export default async function ConsumerMessagesPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;

  let contacts: ConversationContact[] = [];

  try {
    const apiContacts = await api.get<ApiConversation[]>("/conversations");
    contacts = apiContacts.map(transformApiConversation);
  } catch (error) {
    console.log("Could not fetch conversations:", error);
  }

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

  return <ConsumerMessagesClient session={session} contacts={contacts} />;
}
