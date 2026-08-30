import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
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
});
