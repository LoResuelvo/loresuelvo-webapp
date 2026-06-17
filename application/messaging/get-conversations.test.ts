import { describe, expect, it, vi } from "vitest";
import { getConsumerConversations, getProviderConversations } from "./get-conversations";
import { ConversationRepository } from "@/ports/conversation-repository";
import { ConsumerConversationContact, ProviderConversationContact } from "@/domain/messaging/types";

describe("get-conversations", () => {
  const mockConsumerContacts: ConsumerConversationContact[] = [
    {
      id: "conv-1",
      providerId: "10",
      providerName: "Juan",
      providerSurname: "Pérez",
      lastMessage: "Hola",
      lastMessageAt: "12:00",
      pending: false,
    },
  ];

  const mockProviderContacts: ProviderConversationContact[] = [
    {
      id: "conv-1",
      consumerId: "20",
      consumerName: "Andrés",
      consumerSurname: "Gómez",
      lastMessage: "Hola",
      lastMessageAt: "12:00",
      pending: false,
    },
  ];

  const mockConversationRepository = {
    getConsumerConversations: vi.fn(),
    getProviderConversations: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    sendMessage: vi.fn(),
  } as unknown as ConversationRepository;

  describe("getConsumerConversations", () => {
    it("gets consumer conversations successfully", async () => {
      vi.mocked(mockConversationRepository.getConsumerConversations).mockResolvedValue(mockConsumerContacts);

      const res = await getConsumerConversations(mockConversationRepository);
      expect(res).toEqual(mockConsumerContacts);
      expect(mockConversationRepository.getConsumerConversations).toHaveBeenCalled();
    });

    it("propagates the error when the repository fails", async () => {
      vi.mocked(mockConversationRepository.getConsumerConversations).mockRejectedValue(new Error("Database error"));

      await expect(getConsumerConversations(mockConversationRepository)).rejects.toThrow("Database error");
    });
  });

  describe("getProviderConversations", () => {
    it("gets provider conversations successfully", async () => {
      vi.mocked(mockConversationRepository.getProviderConversations).mockResolvedValue(mockProviderContacts);

      const res = await getProviderConversations(mockConversationRepository);
      expect(res).toEqual(mockProviderContacts);
      expect(mockConversationRepository.getProviderConversations).toHaveBeenCalled();
    });

    it("propagates the error when the repository fails", async () => {
      vi.mocked(mockConversationRepository.getProviderConversations).mockRejectedValue(new Error("Database error"));

      await expect(getProviderConversations(mockConversationRepository)).rejects.toThrow("Database error");
    });
  });
});
