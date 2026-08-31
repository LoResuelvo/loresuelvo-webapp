import { useState } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiMessageSender } from "./useAiMessageSender";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";
import type { AiImageAttachment } from "./attachments/ai-image-attachment";
import { USER_ID } from "./useAiConversationLoader";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("useAiMessageSender", () => {
  let mockClient: AssistantClient;

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn();
    mockClient = {
      requestReply: vi.fn().mockResolvedValue("Respuesta de la IA"),
      getConversation: vi.fn(),
    };
  });

  it("sends user message and appends it to messages list", async () => {
    let messages: AiMessage[] = [];
    const setMessages = vi.fn((updater) => {
      if (typeof updater === "function") {
        messages = updater(messages);
      } else {
        messages = updater;
      }
    });

    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };

    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages,
        setMessages,
        isInitialized: true,
        attachments: [],
        clearAttachments,
        textareaRef,
      })
    );

    act(() => {
      result.current.setMessageInput("Tengo una fuga");
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(setMessages).toHaveBeenCalled();
    expect(result.current.messageInput).toBe("");
    expect(clearAttachments).toHaveBeenCalled();
  });

  it("attaches confirmed uploaded images to local message and calls clearAttachments", async () => {
    let messages: AiMessage[] = [];
    const setMessages = vi.fn((updater) => {
      if (typeof updater === "function") {
        messages = updater(messages);
      } else {
        messages = updater;
      }
    });

    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };

    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const uploadedAttachment: AiImageAttachment = {
      id: "att-1",
      file,
      previewUrl: "blob:local/foto.jpg",
      status: "uploaded",
      uploaded: {
        fileId: "file-remote-123",
        url: "https://remote.storage/foto.jpg",
        originalName: "foto.jpg",
      },
    };

    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages,
        setMessages,
        isInitialized: true,
        attachments: [uploadedAttachment],
        clearAttachments,
        textareaRef,
      })
    );

    act(() => {
      result.current.setMessageInput("Miren esta foto");
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(setMessages).toHaveBeenCalled();
    const userMessage = messages.find((m) => m.senderId === USER_ID);
    expect(userMessage?.images).toEqual([
      {
        id: "file-remote-123",
        url: "https://remote.storage/foto.jpg",
        originalName: "foto.jpg",
      },
    ]);
    expect(clearAttachments).toHaveBeenCalled();
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("sends the exact IDs represented by the remote URLs in the local message", async () => {
    let resolveCreate: (value: Awaited<ReturnType<AiChatRepository["create"]>>) => void = () => {};
    const create = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<AiChatRepository["create"]>>>((resolve) => {
          resolveCreate = resolve;
        })
    );
    const repository = { create } as unknown as AiChatRepository;
    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };
    const attachments: AiImageAttachment[] = ["first", "second"].map((name) => ({
      id: `attachment-${name}`,
      file: new File([name], `${name}.jpg`, { type: "image/jpeg" }),
      previewUrl: `blob:local/${name}.jpg`,
      status: "uploaded" as const,
      uploaded: {
        fileId: `file-${name}`,
        url: `https://storage.test/${name}.jpg`,
        originalName: `${name}.jpg`,
      },
    }));

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<AiMessage[]>([]);
      const sender = useAiMessageSender({
        chatRepository: repository,
        messages,
        setMessages,
        isInitialized: true,
        attachments,
        clearAttachments,
        textareaRef,
      });
      return { ...sender, messages };
    });

    act(() => result.current.setMessageInput("Dos imágenes"));
    act(() => result.current.handleSendMessage());

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith("Dos imágenes", ["file-first", "file-second"]);
    });
    expect(result.current.messages.at(-1)?.images).toEqual([
      { id: "file-first", url: "https://storage.test/first.jpg", originalName: "first.jpg" },
      { id: "file-second", url: "https://storage.test/second.jpg", originalName: "second.jpg" },
    ]);
    expect(clearAttachments).toHaveBeenCalledTimes(1);
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate({
        id: 10,
        status: "active",
        title: "Diagnóstico",
        responseStatus: "answered",
        diagnosisCompleted: false,
        messages: [
          {
            id: "assistant-1",
            senderRole: "chatbot",
            content: "Respuesta",
            sentAt: "2026-08-31T12:00:00Z",
          },
        ],
        recommendedProviders: [],
        updatedOn: "2026-08-31T12:00:00Z",
      });
    });
  });

  it("does not send message if any attachment is still uploading or has failed", async () => {
    const messages: AiMessage[] = [];
    const setMessages = vi.fn();
    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };

    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const pendingAttachment: AiImageAttachment = {
      id: "att-1",
      file,
      previewUrl: "blob:local/foto.jpg",
      status: "uploading",
    };

    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages,
        setMessages,
        isInitialized: true,
        attachments: [pendingAttachment],
        clearAttachments,
        textareaRef,
      })
    );

    act(() => {
      result.current.setMessageInput("Mensaje bloqueado");
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(setMessages).not.toHaveBeenCalled();
    expect(clearAttachments).not.toHaveBeenCalled();
  });

  it("does not send a failed attachment", () => {
    const setMessages = vi.fn();
    const clearAttachments = vi.fn();
    const file = new File(["dummy"], "foto.jpg", { type: "image/jpeg" });
    const failedAttachment: AiImageAttachment = {
      id: "att-failed",
      file,
      previewUrl: "blob:local/foto.jpg",
      status: "failed",
      error: "No se pudo cargar",
    };
    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages: [],
        setMessages,
        isInitialized: true,
        attachments: [failedAttachment],
        clearAttachments,
        textareaRef: { current: document.createElement("textarea") },
      })
    );

    act(() => result.current.setMessageInput("Mensaje bloqueado"));
    act(() => result.current.handleSendMessage());

    expect(setMessages).not.toHaveBeenCalled();
    expect(clearAttachments).not.toHaveBeenCalled();
  });

  it("defensively rejects an uploaded status without a confirmed payload", () => {
    const setMessages = vi.fn();
    const clearAttachments = vi.fn();
    const malformedAttachment = {
      id: "att-malformed",
      file: new File(["dummy"], "foto.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:local/foto.jpg",
      status: "uploaded",
    } as unknown as AiImageAttachment;
    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages: [],
        setMessages,
        isInitialized: true,
        attachments: [malformedAttachment],
        clearAttachments,
        textareaRef: { current: document.createElement("textarea") },
      })
    );

    act(() => result.current.setMessageInput("Mensaje bloqueado"));
    act(() => result.current.handleSendMessage());

    expect(setMessages).not.toHaveBeenCalled();
    expect(clearAttachments).not.toHaveBeenCalled();
  });
});
