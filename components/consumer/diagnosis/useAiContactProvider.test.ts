import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiContactProvider } from "./useAiContactProvider";
import type { AiChatRepository } from "@/ports/consumer/ai-chat-repository";
import { ROUTES } from "@/lib/routes";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("useAiContactProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls jobRequestFn and navigates to consumer messages with providerId", async () => {
    const jobRequestFn = vi.fn().mockResolvedValue({ id: 10 });

    const { result } = renderHook(() =>
      useAiContactProvider({
        effectiveConversationId: "conv-1",
        jobRequestFn,
      })
    );

    await act(async () => {
      await result.current.handleContactProvider(42);
    });

    expect(jobRequestFn).toHaveBeenCalledWith("conv-1", 42);
    expect(mockPush).toHaveBeenCalledWith(`${ROUTES.consumer.messages}?provider_id=42`);
  });

  it("throws 409 error when job request already exists", async () => {
    const jobRequestFn = vi.fn().mockResolvedValue({ status: 409 });

    const { result } = renderHook(() =>
      useAiContactProvider({
        effectiveConversationId: "conv-1",
        jobRequestFn,
      })
    );

    await expect(
      result.current.handleContactProvider(42)
    ).rejects.toThrow("409: Ya existe una solicitud de trabajo abierta");
  });

  it("calls chatRepository.createJobRequest if jobRequestFn is not provided", async () => {
    const mockRepo: Partial<AiChatRepository> = {
      createJobRequest: vi.fn().mockResolvedValue({
        id: 1,
        conversationId: 1,
        title: "Test",
        description: "Test description",
      }),
    };

    const { result } = renderHook(() =>
      useAiContactProvider({
        effectiveConversationId: "1",
        chatRepository: mockRepo as AiChatRepository,
      })
    );

    await act(async () => {
      await result.current.handleContactProvider(42);
    });

    expect(mockRepo.createJobRequest).toHaveBeenCalledWith("1", 42);
    expect(mockPush).toHaveBeenCalledWith(`${ROUTES.consumer.messages}?provider_id=42`);
  });
});
