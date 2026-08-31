import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiConversationCommandRepository } from "./api-conversation-command-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiConversationCommandRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates conversation and maps returned last_message to domain Message", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: 456,
        status: "active",
        counterpart: { id: 101, role: "provider", name: "Carlos", surname: "Mendez", category_name: "Plomero" },
        last_message: {
          id: 1,
          sender_role: "consumer",
          content: "Hola prestador",
          created_on: "2026-08-30T10:00:00Z",
          images: [{ id: "img-1", url: "https://cdn.test/img-1.jpg", original_name: "foto.jpg" }],
        },
        updated_on: "2026-08-30T10:00:00Z",
      });

      const repository = new ApiConversationCommandRepository();
      const result = await repository.create({
        counterpartId: 101,
        currentUserId: "consumer-1",
        currentUserRole: "consumer",
        content: "Hola prestador",
        imageFileIds: ["img-1"],
      });

      expect(api.post).toHaveBeenCalledWith("/conversations", {
        counterpart_id: 101,
        content: "Hola prestador",
        image_file_ids: ["img-1"],
      });
      expect(result.conversationId).toBe("456");
      expect(result.message).toMatchObject({
        id: "1",
        content: "Hola prestador",
        senderId: "consumer-1",
        images: [{ id: "img-1", url: "https://cdn.test/img-1.jpg", originalName: "foto.jpg" }],
      });
    });

    it("creates conversation and synthesizes domain Message when last_message is missing", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: 789,
        status: "active",
        counterpart: { id: 102, role: "provider", name: "Ana", surname: "Gomez", category_name: "Gasista" },
        updated_on: "2026-08-30T10:00:00Z",
      });

      const repository = new ApiConversationCommandRepository();
      const result = await repository.create({
        counterpartId: 102,
        currentUserId: "consumer-2",
        currentUserRole: "consumer",
        content: "Primer contacto",
      });

      expect(api.post).toHaveBeenCalledWith("/conversations", {
        counterpart_id: 102,
        content: "Primer contacto",
      });
      expect(result.conversationId).toBe("789");
      expect(result.message).toMatchObject({
        content: "Primer contacto",
        senderId: "consumer-2",
      });
    });
  });

  describe("sendMessage", () => {
    it("posts text/image message and returns mapped domain Message", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: 20,
        sender_role: "consumer",
        content: "Mi mensaje",
        created_on: "2026-08-30T10:05:00Z",
        images: [{ id: "img-2", url: "https://cdn.test/img-2.jpg", original_name: "foto2.jpg" }],
      });

      const repository = new ApiConversationCommandRepository();
      const message = await repository.sendMessage({
        conversationId: "conv-123",
        counterpartId: 101,
        currentUserId: "consumer-1",
        currentUserRole: "consumer",
        content: "Mi mensaje",
        imageFileIds: ["img-2"],
      });

      expect(api.post).toHaveBeenCalledWith("/conversations/conv-123/messages", {
        content: "Mi mensaje",
        image_file_ids: ["img-2"],
      });
      expect(message).toMatchObject({
        id: "20",
        content: "Mi mensaje",
        senderId: "consumer-1",
        images: [{ id: "img-2", url: "https://cdn.test/img-2.jpg", originalName: "foto2.jpg" }],
      });
    });
  });

  describe("sendAudioMessage", () => {
    it("posts audio_file_id payload and returns mapped domain Message with audio metadata", async () => {
      vi.mocked(api.post).mockResolvedValue({
        id: 99,
        sender_role: "consumer",
        created_on: "2026-08-25T21:00:00Z",
        audio: {
          id: "audio-1",
          url: "https://cdn.test/audio.webm",
          original_name: "audio.webm",
          duration_seconds: 18,
          mime_type: "audio/webm",
          size_bytes: 5000,
        },
      });

      const repository = new ApiConversationCommandRepository();
      const message = await repository.sendAudioMessage({
        conversationId: "conv-1",
        counterpartId: 101,
        currentUserId: "consumer-1",
        currentUserRole: "consumer",
        audioFileId: "audio-1",
      });

      expect(api.post).toHaveBeenCalledWith("/conversations/conv-1/messages", {
        audio_file_id: "audio-1",
      });
      expect(message).toMatchObject({
        id: "99",
        senderId: "consumer-1",
        audio: {
          id: "audio-1",
          url: "https://cdn.test/audio.webm",
          originalName: "audio.webm",
          durationSeconds: 18,
          mimeType: "audio/webm",
          sizeBytes: 5000,
        },
      });
    });
  });
});
