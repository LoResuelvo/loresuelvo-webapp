import { describe, expect, it, vi } from "vitest";
import { createConversation, sendMessage } from "./send-message";
import { ConversationRepository } from "@/ports/conversation-repository";

describe("send-message", () => {
  const mockConversationRepository = {
    create: vi.fn(),
    sendMessage: vi.fn(),
  } as unknown as ConversationRepository;

  describe("createConversation", () => {
    it("creates a conversation and returns its ID", async () => {
      vi.mocked(mockConversationRepository.create).mockResolvedValue({ id: 456 });

      const res = await createConversation(mockConversationRepository, 101, "Hola prestador");
      expect(res).toEqual({ id: 456 });
      expect(mockConversationRepository.create).toHaveBeenCalledWith({ counterpart_id: 101, content: "Hola prestador" });
    });
  });

  describe("sendMessage", () => {
    it("sends a message to an existing conversation", async () => {
      vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue({ success: true });

      const res = await sendMessage(mockConversationRepository, "conv-123", "Mi mensaje");
      expect(res).toEqual({ success: true });
      expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith("conv-123", "Mi mensaje");
    });
  });
});
