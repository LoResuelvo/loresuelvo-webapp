import { describe, expect, it, vi } from "vitest";
import { createConversation, sendMessage } from "./send-message";
import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { Message } from "@/domain/messaging/types";

describe("send-message", () => {
  const dummyMessage: Message = {
    id: "msg-1",
    senderId: "user-1",
    content: "Hola",
    sentAt: "10:00",
    createdOn: "2026-08-30T10:00:00Z",
  };

  const mockConversationRepository: ConversationCommandRepository = {
    create: vi.fn(),
    sendMessage: vi.fn(),
    sendAudioMessage: vi.fn(),
  };

  describe("createConversation", () => {
    it("creates a conversation and returns CreatedConversation", async () => {
      vi.mocked(mockConversationRepository.create).mockResolvedValue({
        conversationId: "456",
        message: dummyMessage,
      });

      const command = {
        counterpartId: 101,
        currentUserId: "user-1",
        currentUserRole: "consumer" as const,
        content: "Hola prestador",
      };

      const res = await createConversation(mockConversationRepository, command);
      expect(res).toEqual({ conversationId: "456", message: dummyMessage });
      expect(mockConversationRepository.create).toHaveBeenCalledWith(command);
    });
  });

  describe("sendMessage", () => {
    it("sends a message to an existing conversation", async () => {
      vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue(dummyMessage);

      const command = {
        conversationId: "conv-123",
        counterpartId: 101,
        currentUserId: "user-1",
        currentUserRole: "consumer" as const,
        content: "Mi mensaje",
      };

      const res = await sendMessage(mockConversationRepository, command);
      expect(res).toEqual(dummyMessage);
      expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith(command);
    });

    it("sends a message with only images", async () => {
      vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue(dummyMessage);

      const command = {
        conversationId: "conv-123",
        counterpartId: 101,
        currentUserId: "user-1",
        currentUserRole: "consumer" as const,
        imageFileIds: ["img-1", "img-2"],
      };

      const res = await sendMessage(mockConversationRepository, command);
      expect(res).toEqual(dummyMessage);
      expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith(command);
    });

    it("sends a message with both text and images", async () => {
      vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue(dummyMessage);

      const command = {
        conversationId: "conv-123",
        counterpartId: 101,
        currentUserId: "user-1",
        currentUserRole: "consumer" as const,
        content: "Mira esto",
        imageFileIds: ["img-1"],
      };

      const res = await sendMessage(mockConversationRepository, command);
      expect(res).toEqual(dummyMessage);
      expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith(command);
    });
  });
});
