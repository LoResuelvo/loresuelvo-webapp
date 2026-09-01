import { useState } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiMessageSender } from "./useAiMessageSender";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiMessage } from "@/domain/diagnosis/types";
import type { AiImageAttachment } from "./attachments/ai-image-attachment";
import { USER_ID } from "./ai-conversation-mapper";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import type { AiConversationDetail } from "@/domain/messaging/types";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function aDetail(id: number, content: string): AiConversationDetail {
  return {
    id,
    status: "active",
    title: "Diagnóstico",
    responseStatus: "answered",
    diagnosisCompleted: false,
    messages: [
      {
        id: `assistant-${id}`,
        senderRole: "chatbot",
        content,
        sentAt: "2026-08-31T12:00:00Z",
      },
    ],
    recommendedProviders: [],
    updatedOn: "2026-08-31T12:00:00Z",
  };
}

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

  it("sends user message, appends it optimistically and calls clearAttachments", async () => {
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
        setMessages,
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
        setMessages,
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
    const { promise, resolve } = deferred<AiConversationDetail>();
    const create = vi.fn(() => promise);
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
        setMessages,
        attachments,
        clearAttachments,
        textareaRef,
      });
      return { ...sender, messages };
    });

    act(() => result.current.setMessageInput("Dos imágenes"));
    act(() => {
      void result.current.handleSendMessage();
    });

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith("Dos imágenes", ["file-first", "file-second"]);
    });
    expect(result.current.messages.at(-1)?.images).toEqual([
      { id: "file-first", url: "https://storage.test/first.jpg", originalName: "first.jpg" },
      { id: "file-second", url: "https://storage.test/second.jpg", originalName: "second.jpg" },
    ]);
    expect(clearAttachments).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve(aDetail(10, "Respuesta"));
    });
  });

  it("blocks concurrent send in the same turn and creates only one optimistic message", async () => {
    const { promise, resolve } = deferred<AiConversationDetail>();
    const create = vi.fn(() => promise);
    const repository: Partial<AiChatRepository> = { create };
    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<AiMessage[]>([]);
      const sender = useAiMessageSender({
        chatRepository: repository as AiChatRepository,
        setMessages,
        attachments: [],
        clearAttachments,
        textareaRef,
      });
      return { ...sender, messages };
    });

    act(() => {
      result.current.setMessageInput("Mensaje simultáneo");
    });

    // Two send invocations in the exact same act turn
    act(() => {
      void result.current.handleSendMessage();
      void result.current.handleSendMessage();
    });

    // Exactly one optimistic message added, exactly one create call
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("Mensaje simultáneo");
    expect(create).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve(aDetail(1, "Respuesta"));
    });
  });

  it("does not send message if any attachment is still uploading or has failed", async () => {
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
        setMessages,
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
        setMessages,
        attachments: [failedAttachment],
        clearAttachments,
        textareaRef: { current: document.createElement("textarea") },
      })
    );

    act(() => result.current.setMessageInput("Mensaje bloqueado"));
    act(() => {
      void result.current.handleSendMessage();
    });

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
        setMessages,
        attachments: [malformedAttachment],
        clearAttachments,
        textareaRef: { current: document.createElement("textarea") },
      })
    );

    act(() => result.current.setMessageInput("Mensaje bloqueado"));
    act(() => {
      void result.current.handleSendMessage();
    });

    expect(setMessages).not.toHaveBeenCalled();
    expect(clearAttachments).not.toHaveBeenCalled();
  });

  it("allows retrying failed send via handleRetry", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(aDetail(10, "Respuesta tras reintento"));

    const repository = { sendMessage } as unknown as AiChatRepository;
    const setMessages = vi.fn();
    const clearAttachments = vi.fn();
    const textareaRef = { current: document.createElement("textarea") };

    const { result } = renderHook(() =>
      useAiMessageSender({
        chatRepository: repository,
        effectiveConversationId: "10",
        setMessages,
        attachments: [],
        clearAttachments,
        textareaRef,
      })
    );

    act(() => result.current.setMessageInput("Mensaje a reintentar"));
    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(result.current.chatError).toBe("No pudimos obtener una respuesta en este momento");

    await act(async () => {
      await result.current.handleRetry();
    });

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenLastCalledWith("10", "Mensaje a reintentar", undefined);
    expect(result.current.chatError).toBeNull();
  });
});
