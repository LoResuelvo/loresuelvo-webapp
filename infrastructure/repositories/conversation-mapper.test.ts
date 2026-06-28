import { describe, expect, it } from "vitest";
import { transformApiToConsumerContact, transformApiToProviderContact, transformApiToConversationDetail } from "./conversation-mapper";
import { ApiConversation, ApiConversationDetail } from "@/infrastructure/api/types";

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


describe("transformApiToConversationDetail", () => {
  it("transforms ApiConversationDetail to ConversationDetailInfo and maps images correctly", () => {
    const mockDetail: ApiConversationDetail = {
      id: 42,
      status: "active",
      work: {
        counterpart: {
          id: 100,
          role: "provider",
          name: "Luis",
          surname: "Gomez",
          category_name: "Electricidad",
        }
      },
      updated_on: "2026-06-16T12:00:00Z",
      messages: [
        {
          id: 1,
          sender_role: "consumer",
          content: "Hola",
          created_on: "2026-06-16T12:01:00Z",
        },
        {
          id: 2,
          sender_role: "provider",
          images: [
            { id: "img-1", url: "http://example.com/img1.jpg", original_name: "foto.jpg" }
          ],
          created_on: "2026-06-16T12:02:00Z",
        }
      ]
    };

    const result = transformApiToConversationDetail(mockDetail);
    expect(result.id).toBe(42);
    expect(result.messages).toHaveLength(2);

    expect(result.messages[0].content).toBe("Hola");
    expect(result.messages[0].images).toBeUndefined();

    expect(result.messages[1].content).toBeUndefined();
    expect(result.messages[1].images).toHaveLength(1);
    expect(result.messages[1].images?.[0]).toEqual({
      id: "img-1",
      url: "http://example.com/img1.jpg",
      originalName: "foto.jpg"
    });
  });
});
