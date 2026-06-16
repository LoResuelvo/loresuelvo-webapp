import { describe, expect, it } from "vitest";
import { transformApiToConsumerContact, transformApiToProviderContact } from "./conversation-mapper";
import { ApiConversation } from "@/infrastructure/api/types";

const mockApiConv: ApiConversation = {
  id: 12,
  status: "pending",
  counterpart: {
    id: 99,
    role: "provider",
    name: "Carlos",
    surname: "Mendoza",
    category_name: "Plomería",
  },
  last_message: {
    id: 1,
    sender_role: "provider",
    content: "Hola Andrés, ¿en qué te puedo ayudar?",
    created_on: "2026-06-16T12:00:00Z",
  },
  updated_on: "2026-06-16T12:00:00Z",
};

describe("transformApiToConsumerContact", () => {
  it("transforms ApiConversation to ConsumerConversationContact successfully", () => {
    const contact = transformApiToConsumerContact(mockApiConv);
    expect(contact.id).toBe("conv-12");
    expect(contact.providerId).toBe("99");
    expect(contact.providerName).toBe("Carlos");
    expect(contact.providerSurname).toBe("Mendoza");
    expect(contact.lastMessage).toBe("Hola Andrés, ¿en qué te puedo ayudar?");
    expect(contact.lastMessageAt).toBeTruthy();
    expect(contact.pending).toBe(true);
  });

  it("handles conversations without a last message successfully", () => {
    const withoutLastMessage: ApiConversation = {
      ...mockApiConv,
      last_message: undefined,
    };
    const contact = transformApiToConsumerContact(withoutLastMessage);
    expect(contact.lastMessage).toBe("");
    expect(contact.lastMessageAt).toBe("");
  });
});

describe("transformApiToProviderContact", () => {
  it("transforms ApiConversation to ProviderConversationContact successfully", () => {
    const contact = transformApiToProviderContact(mockApiConv);
    expect(contact.id).toBe("conv-12");
    expect(contact.consumerId).toBe("99");
    expect(contact.consumerName).toBe("Carlos");
    expect(contact.consumerSurname).toBe("Mendoza");
    expect(contact.lastMessage).toBe("Hola Andrés, ¿en qué te puedo ayudar?");
    expect(contact.lastMessageAt).toBeTruthy();
    expect(contact.pending).toBe(true);
  });
});
