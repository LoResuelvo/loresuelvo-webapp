import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePendingAiConversationCreation } from "./usePendingAiConversationCreation";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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

describe("usePendingAiConversationCreation", () => {
  let mockChatRepo: AiChatRepository;
  const mockSessionStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage["pendingAiMessage"] = JSON.stringify({
      text: "Pérdida en el baño",
      imageIds: ["file-home-1"],
    });

    Object.defineProperty(global, "sessionStorage", {
      value: {
        getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
      },
      writable: true,
    });

    mockChatRepo = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      createJobRequest: vi.fn(),
      getConversations: vi.fn(),
    };
  });

  afterEach(() => {
    delete mockSessionStorage["pendingAiMessage"];
  });

  it("creates conversation exactly once with images and redirects", async () => {
    (mockChatRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 55,
      messages: [],
      recommendedProviders: [],
      diagnosisCompleted: false,
    });

    const { result } = renderHook(() =>
      usePendingAiConversationCreation({
        effectiveConversationId: null,
        chatRepository: mockChatRepo,
      })
    );

    expect(result.current.initialPendingMessages).toHaveLength(1);
    expect(result.current.initialPendingMessages[0].content).toBe("Pérdida en el baño");

    await waitFor(() => {
      expect(mockChatRepo.create).toHaveBeenCalledTimes(1);
      expect(mockChatRepo.create).toHaveBeenCalledWith("Pérdida en el baño", ["file-home-1"]);
      expect(mockRouter.replace).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=55");
    });

    expect(result.current.creationError).toBeNull();
    expect(result.current.isCreatingPending).toBe(false);
  });

  it("preserves payload upon failure and retries with exact same content and image IDs", async () => {
    (mockChatRepo.create as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("API Error"))
      .mockResolvedValueOnce({
        id: 56,
        messages: [],
        recommendedProviders: [],
        diagnosisCompleted: false,
      });

    const { result } = renderHook(() =>
      usePendingAiConversationCreation({
        effectiveConversationId: null,
        chatRepository: mockChatRepo,
      })
    );

    await waitFor(() => {
      expect(mockChatRepo.create).toHaveBeenCalledTimes(1);
      expect(result.current.creationError).toBe("No pudimos obtener una respuesta en este momento");
    });

    await act(async () => {
      await result.current.retryPendingCreation();
    });

    expect(mockChatRepo.create).toHaveBeenCalledTimes(2);
    expect(mockChatRepo.create).toHaveBeenLastCalledWith("Pérdida en el baño", ["file-home-1"]);
    expect(mockRouter.replace).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=56");
    expect(result.current.creationError).toBeNull();
  });

  it("synchronously blocks concurrent retryPendingCreation calls in the same turn", async () => {
    const { promise, resolve } = deferred<Awaited<ReturnType<AiChatRepository["create"]>>>();
    const create = vi.fn().mockRejectedValueOnce(new Error("First fail")).mockReturnValue(promise);
    const mockRepo: Partial<AiChatRepository> = { create };

    const { result } = renderHook(() =>
      usePendingAiConversationCreation({
        effectiveConversationId: null,
        chatRepository: mockRepo as AiChatRepository,
      })
    );

    await waitFor(() => {
      expect(create).toHaveBeenCalledTimes(1);
      expect(result.current.creationError).toBe("No pudimos obtener una respuesta en este momento");
    });

    // Invoke retry twice synchronously in the same act block
    act(() => {
      void result.current.retryPendingCreation();
      void result.current.retryPendingCreation();
    });

    // Exactly one retry invocation should have started
    expect(create).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolve({
        id: 57,
        status: "active",
        title: "Test",
        responseStatus: "answered",
        diagnosisCompleted: false,
        messages: [],
        recommendedProviders: [],
        updatedOn: "2026-06-18T10:00:00Z",
      });
    });

    expect(result.current.creationError).toBeNull();
  });
});
