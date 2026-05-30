import { getAuthService } from "@/lib/auth";
import { api, ApiClientError } from "@/lib/api/base-client";
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

interface CreateConversationResponse {
  id: number;
  provider_id: number;
  status: string;
}

interface PageProps {
  searchParams: Promise<{ provider_id?: string; name?: string; surname?: string }>;
}

export default async function ConsumerMessagesPage({ searchParams }: PageProps) {
  const session = await getAuthService().getSession();
  const params = await searchParams;
  const providerId = params.provider_id;

  let contacts: ConversationContact[] = [];

  try {
    const apiContacts = await api.get<ConversationContact[]>("/conversations");
    contacts = apiContacts;
  } catch (error) {
    console.log("Could not fetch conversations:", error);
  }

  if (providerId) {
    const existingContact = contacts.find(c => c.providerId === providerId);

    if (!existingContact) {
      try {
        const newConversation = await api.post<CreateConversationResponse>("/conversations", {
          provider_id: parseInt(providerId),
          content: "Hola, me gustaría contactarte para solicitar tus servicios.",
        });

        const newContact: ConversationContact = {
          id: `conv-${newConversation.id}`,
          providerId,
          providerName: params.name || "Carlos",
          providerSurname: params.surname || "Méndez",
          lastMessage: "",
          lastMessageAt: "Ahora",
          pending: newConversation.status === "pending",
        };
        contacts = [newContact, ...contacts];
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 409) {
          console.log("Conversation already exists for this provider");
          const mockContact: ConversationContact = {
            id: `conv-${providerId}`,
            providerId,
            providerName: params.name || "Carlos",
            providerSurname: params.surname || "Méndez",
            lastMessage: "",
            lastMessageAt: "Ahora",
            pending: true,
          };
          contacts = [mockContact, ...contacts];
        } else {
          console.log("Could not create conversation:", error);
          const mockContact: ConversationContact = {
            id: `conv-${providerId}`,
            providerId,
            providerName: params.name || "Carlos",
            providerSurname: params.surname || "Méndez",
            lastMessage: "",
            lastMessageAt: "Ahora",
            pending: true,
          };
          contacts = [mockContact, ...contacts];
        }
      }
    }
  }

  return <ConsumerMessagesClient session={session} contacts={contacts} />;
}