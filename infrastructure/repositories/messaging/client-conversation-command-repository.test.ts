import { describe, expect, it, vi } from "vitest";
import { ClientConversationCommandRepository } from "./client-conversation-command-repository";
import { Message } from "@/domain/messaging/types";

describe("ClientConversationCommandRepository", () => {
  const dummyMessage: Message = {
    id: "msg-1",
    senderId: "user-1",
    content: "Hola",
    sentAt: "10:00",
    createdOn: "2026-08-30T10:00:00Z",
  };

  it("delegates create to the injected action", async () => {
    const createMock = vi.fn().mockResolvedValue({
      conversationId: "conv-1",
      message: dummyMessage,
    });

    const repo = new ClientConversationCommandRepository({
      create: createMock,
      sendMessage: vi.fn(),
    });

    const command = {
      counterpartId: 10,
      currentUserId: "user-1",
      currentUserRole: "consumer" as const,
      content: "Hola",
    };

    const result = await repo.create(command);
    expect(createMock).toHaveBeenCalledWith(command);
    expect(result.conversationId).toBe("conv-1");
    expect(result.message).toEqual(dummyMessage);
  });

  it("delegates sendMessage to the injected action", async () => {
    const sendMessageMock = vi.fn().mockResolvedValue(dummyMessage);

    const repo = new ClientConversationCommandRepository({
      create: vi.fn(),
      sendMessage: sendMessageMock,
    });

    const command = {
      conversationId: "conv-1",
      counterpartId: 10,
      currentUserId: "user-1",
      currentUserRole: "consumer" as const,
      content: "Hola",
    };

    const result = await repo.sendMessage(command);
    expect(sendMessageMock).toHaveBeenCalledWith(command);
    expect(result).toEqual(dummyMessage);
  });

  it("delegates sendAudioMessage when provided", async () => {
    const sendAudioMock = vi.fn().mockResolvedValue(dummyMessage);

    const repo = new ClientConversationCommandRepository({
      create: vi.fn(),
      sendMessage: vi.fn(),
      sendAudioMessage: sendAudioMock,
    });

    const command = {
      conversationId: "conv-1",
      counterpartId: 10,
      currentUserId: "user-1",
      currentUserRole: "consumer" as const,
      audioFileId: "audio-1",
    };

    const result = await repo.sendAudioMessage(command);
    expect(sendAudioMock).toHaveBeenCalledWith(command);
    expect(result).toEqual(dummyMessage);
  });

  it("throws an error when sendAudioMessage is called but not configured", async () => {
    const repo = new ClientConversationCommandRepository({
      create: vi.fn(),
      sendMessage: vi.fn(),
    });

    const command = {
      conversationId: "conv-1",
      counterpartId: 10,
      currentUserId: "user-1",
      currentUserRole: "consumer" as const,
      audioFileId: "audio-1",
    };

    await expect(repo.sendAudioMessage(command)).rejects.toThrow(
      "Audio messaging is not configured for this repository"
    );
  });
});
