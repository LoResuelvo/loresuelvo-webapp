import { describe, it, expect } from "vitest";
import {
  mapApiToAiConversationContact,
  mapApiToAiConversationDetail,
  mapApiToAiMessage,
} from "./ai-chat-mapper";

describe("ai-chat-mapper", () => {
  describe("mapApiToAiConversationContact", () => {
    it("should map api conversation to domain contact", () => {
      const api = {
        id: 1,
        status: "active",
        title: "Pérdida de agua",
        last_message: {
          id: 2,
          sender_role: "chatbot",
          content: "Revisá el sifón",
          created_on: "2026-06-18T12:00:00Z",
        },
        updated_on: "2026-06-18T12:00:00Z",
      };

      const result = mapApiToAiConversationContact(api);

      expect(result.id).toBe("1");
      expect(result.title).toBe("Pérdida de agua");
      expect(result.lastMessage).toBe("Revisá el sifón");
      expect(result.lastMessageAt).toBe("2026-06-18T12:00:00Z");
    });

    it("should handle missing last_message", () => {
      const api = {
        id: 2,
        status: "active",
        title: "Nueva consulta",
        updated_on: "2026-06-18T12:00:00Z",
      };

      const result = mapApiToAiConversationContact(api);

      expect(result.id).toBe("2");
      expect(result.lastMessage).toBe("");
      expect(result.lastMessageAt).toBe("2026-06-18T12:00:00Z");
    });
  });

  describe("mapApiToAiMessage", () => {
    it("should map consumer message", () => {
      const api = {
        id: 1,
        sender_role: "consumer",
        content: "Hola",
        created_on: "2026-06-18T12:00:00Z",
      };

      const result = mapApiToAiMessage(api);

      expect(result.id).toBe("1");
      expect(result.senderRole).toBe("consumer");
      expect(result.content).toBe("Hola");
      expect(result.sentAt).toBe("2026-06-18T12:00:00Z");
    });

    it("should map chatbot message", () => {
      const api = {
        id: 2,
        sender_role: "chatbot",
        content: "Buenos días",
        created_on: "2026-06-18T12:00:01Z",
      };

      const result = mapApiToAiMessage(api);

      expect(result.senderRole).toBe("chatbot");
    });
  });

  describe("mapApiToAiConversationDetail", () => {
    it("should map full conversation detail", () => {
      const api = {
        id: 1,
        conversation_id: 1,
        status: "active",
        title: "Pérdida de agua",
        response_status: "answered",
        messages: [
          {
            id: 1,
            sender_role: "consumer",
            content: "Hay pérdida",
            created_on: "2026-06-18T12:00:00Z",
          },
          {
            id: 2,
            sender_role: "chatbot",
            content: "Revisá el sifón",
            created_on: "2026-06-18T12:00:01Z",
          },
        ],
        recommended_providers: [],
      };

      const result = mapApiToAiConversationDetail(api);

      expect(result.id).toBe(1);
      expect(result.title).toBe("Pérdida de agua");
      expect(result.status).toBe("active");
      expect(result.responseStatus).toBe("answered");
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].senderRole).toBe("consumer");
      expect(result.messages[1].senderRole).toBe("chatbot");
    });
  });
});
