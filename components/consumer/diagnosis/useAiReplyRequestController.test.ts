import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  useAiReplyRequestController,
  type AiMessageAttempt,
} from "./useAiReplyRequestController";
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
        id: `msg-${id}`,
        senderRole: "chatbot",
        content,
        sentAt: "2026-06-18T10:00:00Z",
      },
    ],
    recommendedProviders: [],
    updatedOn: "2026-06-18T10:00:00Z",
  };
}

describe("useAiReplyRequestController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new conversation when no conversationId exists", async () => {
    const create = vi.fn().mockResolvedValue(aDetail(123, "Respuesta inicial"));
    const mockRepo: Partial<AiChatRepository> = { create };
    const setMessages = vi.fn();

    const { result } = renderHook(() =>
      useAiReplyRequestController({
        chatRepository: mockRepo as AiChatRepository,
        effectiveConversationId: null,
        setMessages,
      })
    );

    const attempt: AiMessageAttempt = {
      content: "Fuga en bacha",
      imageFileIds: ["img-1", "img-2"],
    };

    await act(async () => {
      result.current.tryExecuteAttempt(attempt);
    });

    expect(create).toHaveBeenCalledWith("Fuga en bacha", ["img-1", "img-2"]);
    expect(setMessages).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=123");
    expect(result.current.isWaitingForReply).toBe(false);
    expect(result.current.chatError).toBeNull();
  });

  it("sends message to existing conversation via sendMessage", async () => {
    const sendMessage = vi.fn().mockResolvedValue(aDetail(456, "Respuesta seguimiento"));
    const mockRepo: Partial<AiChatRepository> = { sendMessage };
    const setMessages = vi.fn();

    const { result } = renderHook(() =>
      useAiReplyRequestController({
        chatRepository: mockRepo as AiChatRepository,
        effectiveConversationId: "456",
        setMessages,
      })
    );

    const attempt: AiMessageAttempt = {
      content: "Sigue perdiendo",
      imageFileIds: ["img-3"],
    };

    await act(async () => {
      result.current.tryExecuteAttempt(attempt);
    });

    expect(sendMessage).toHaveBeenCalledWith("456", "Sigue perdiendo", ["img-3"]);
    expect(setMessages).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("preserves attempt on failure and retries with the exact same payload", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Server error"))
      .mockResolvedValueOnce(aDetail(789, "Respuesta OK tras reintento"));

    const mockRepo: Partial<AiChatRepository> = { sendMessage };
    const setMessages = vi.fn();

    const { result } = renderHook(() =>
      useAiReplyRequestController({
        chatRepository: mockRepo as AiChatRepository,
        effectiveConversationId: "789",
        setMessages,
      })
    );

    const attempt: AiMessageAttempt = {
      content: "Mensaje fallido",
      imageFileIds: ["img-fail"],
    };

    await act(async () => {
      result.current.tryExecuteAttempt(attempt);
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(result.current.isWaitingForReply).toBe(false);
    expect(result.current.chatError).toBe("No pudimos obtener una respuesta en este momento");

    await act(async () => {
      await result.current.retry();
    });

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenLastCalledWith("789", "Mensaje fallido", ["img-fail"]);
    expect(result.current.chatError).toBeNull();
  });

  it("synchronously blocks concurrent attempts in the same turn", async () => {
    const { promise, resolve } = deferred<AiConversationDetail>();
    const sendMessage = vi.fn(() => promise);
    const mockRepo: Partial<AiChatRepository> = { sendMessage };
    const setMessages = vi.fn();

    const { result } = renderHook(() =>
      useAiReplyRequestController({
        chatRepository: mockRepo as AiChatRepository,
        effectiveConversationId: "100",
        setMessages,
      })
    );

    const attempt1: AiMessageAttempt = { content: "Primer intento", imageFileIds: [] };
    const attempt2: AiMessageAttempt = { content: "Segundo intento concurrente", imageFileIds: [] };

    let firstStarted = false;
    let secondStarted = true;

    act(() => {
      firstStarted = result.current.tryExecuteAttempt(attempt1);
      secondStarted = result.current.tryExecuteAttempt(attempt2);
    });

    expect(firstStarted).toBe(true);
    expect(secondStarted).toBe(false);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(result.current.isWaitingForReply).toBe(true);

    await act(async () => {
      resolve(aDetail(100, "Respuesta"));
    });

    expect(result.current.isWaitingForReply).toBe(false);
  });

  it("does not update state when unmounted before request resolves", async () => {
    const { promise, resolve } = deferred<AiConversationDetail>();
    const sendMessage = vi.fn(() => promise);
    const mockRepo: Partial<AiChatRepository> = { sendMessage };
    const setMessages = vi.fn();

    const { result, unmount } = renderHook(() =>
      useAiReplyRequestController({
        chatRepository: mockRepo as AiChatRepository,
        effectiveConversationId: "100",
        setMessages,
      })
    );

    act(() => {
      result.current.tryExecuteAttempt({ content: "Mensaje antes de desmontar", imageFileIds: [] });
    });

    unmount();

    await act(async () => {
      resolve(aDetail(100, "Respuesta"));
    });

    expect(setMessages).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
