import { getAuthService } from "@/lib/auth";
import { api } from "@/lib/api/base-client";
import ConsumerMessagesClient from "./ConsumerMessagesClient";

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
  searchParams: Promise<{ provider_id?: string }>;
}

export default async function ConsumerMessagesPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;
  const providerId = params.provider_id;

  let contacts: ConversationContact[] = [];
  
  try {
    const apiContacts = await api.get<ConversationContact[]>("/conversations");
    if (apiContacts && Array.isArray(apiContacts)) {
      contacts = apiContacts;
    }
  } catch (error) {
    console.log("API not available, using mock data if provider_id present");
  }

  if (providerId && contacts.length === 0) {
    contacts = [{
      id: `conv-${providerId}`,
      providerId,
      providerName: "Carlos",
      providerSurname: "Méndez",
      lastMessage: "Hola, me gustaría contratarte para...",
      lastMessageAt: "Hace 5 min",
      pending: true,
    }];
  }

  return <ConsumerMessagesClient session={session} contacts={contacts} />;
}