import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAiConversationLoader } from "./useAiConversationLoader";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};
let mockSearchParamId: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === "id" ? mockSearchParamId : null)),
  }),
}));

describe("useAiConversationLoader", () => {
  let mockChatRepo: AiChatRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamId = null;
    mockChatRepo = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getById: vi.fn(),
      createJobRequest: vi.fn(),
      getConversations: vi.fn(),
    };
  });

  it("initializes with empty messages when no conversation ID is present", () => {
    const { result } = renderHook(() =>
      useAiConversationLoader({
        conversationId: null,
      })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.effectiveConversationId).toBeNull();
    expect(result.current.isCreatingPending).toBe(false);
    expect(result.current.creationError).toBeNull();
  });

  it("loads conversation messages when conversationId is provided", async () => {
    (mockChatRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      status: "active",
      title: "Test",
      responseStatus: "done",
      diagnosisCompleted: true,
      messages: [
        { id: "m1", senderRole: "consumer", content: "Tengo una fuga", sentAt: "2026-05-31T12:00:00Z" },
        { id: "m2", senderRole: "chatbot", content: "Donde está la fuga?", sentAt: "2026-05-31T12:01:00Z" },
      ],
      recommendedProviders: [],
      updatedOn: "2026-05-31T12:01:00Z",
    });

    const { result } = renderHook(() =>
      useAiConversationLoader({
        conversationId: "10",
        chatRepository: mockChatRepo,
      })
    );

    await waitFor(() => {
      expect(mockChatRepo.getById).toHaveBeenCalledWith("10");
      expect(result.current.messages.length).toBe(2);
    });

    expect(result.current.messages[0].content).toBe("Tengo una fuga");
    expect(result.current.messages[1].content).toBe("Donde está la fuga?");
  });

  it("clears messages when transitioning from an existing conversation to null without pending creation", async () => {
    (mockChatRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      status: "active",
      title: "Test",
      responseStatus: "done",
      diagnosisCompleted: true,
      messages: [
        { id: "m1", senderRole: "consumer", content: "Tengo una fuga", sentAt: "2026-05-31T12:00:00Z" },
      ],
      recommendedProviders: [],
      updatedOn: "2026-05-31T12:00:00Z",
    });

    const { result, rerender } = renderHook(
      ({ conversationId }: { conversationId: string | null }) =>
        useAiConversationLoader({
          conversationId,
          chatRepository: mockChatRepo,
        }),
      {
        initialProps: { conversationId: "10" as string | null },
      }
    );

    await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
    });

    // User navigates to New Chat (conversationId becomes null)
    rerender({ conversationId: null });

    await waitFor(() => {
      expect(result.current.effectiveConversationId).toBeNull();
      expect(result.current.messages).toEqual([]);
    });
  });

  describe("pendingAiMessage from sessionStorage and retryPendingCreation", () => {
    const mockSessionStorage: Record<string, string> = {};

    beforeEach(() => {
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
        useAiConversationLoader({
          conversationId: null,
          chatRepository: mockChatRepo,
        })
      );

      await waitFor(() => {
        expect(mockChatRepo.create).toHaveBeenCalledTimes(1);
        expect(mockChatRepo.create).toHaveBeenCalledWith("Pérdida en el baño", ["file-home-1"]);
        expect(mockRouter.replace).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=55");
      });

      expect(result.current.creationError).toBeNull();
      expect(result.current.isCreatingPending).toBe(false);
    });

    it("preserves optimistic message from Home when pending creation is in progress or failed", async () => {
      (mockChatRepo.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("API Error"));

      const { result } = renderHook(() =>
        useAiConversationLoader({
          conversationId: null,
          chatRepository: mockChatRepo,
        })
      );

      // Optimistic message is preserved and not cleared
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("Pérdida en el baño");

      await waitFor(() => {
        expect(result.current.creationError).toBe("No pudimos obtener una respuesta en este momento");
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("Pérdida en el baño");
    });

    it("preserves payload upon creation failure and allows retrying creation", async () => {
      (mockChatRepo.create as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce({
          id: 56,
          messages: [],
          recommendedProviders: [],
          diagnosisCompleted: false,
        });

      const { result } = renderHook(() =>
        useAiConversationLoader({
          conversationId: null,
          chatRepository: mockChatRepo,
        })
      );

      await waitFor(() => {
        expect(mockChatRepo.create).toHaveBeenCalledTimes(1);
        expect(result.current.creationError).toBe("No pudimos obtener una respuesta en este momento");
      });

      expect(result.current.isCreatingPending).toBe(false);

      // Now retry pending creation
      await act(async () => {
        await result.current.retryPendingCreation();
      });

      expect(mockChatRepo.create).toHaveBeenCalledTimes(2);
      expect(mockChatRepo.create).toHaveBeenLastCalledWith("Pérdida en el baño", ["file-home-1"]);
      expect(mockRouter.replace).toHaveBeenCalledWith("/consumidor/mensajes-ia?id=56");
      expect(result.current.creationError).toBeNull();
      expect(result.current.isCreatingPending).toBe(false);
    });
  });
});
