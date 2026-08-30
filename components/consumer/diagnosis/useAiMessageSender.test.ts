import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAiMessageSender } from "./useAiMessageSender";
import { AssistantClient } from "@/ports/consumer/assistant-client";
import type { AiMessage } from "@/infrastructure/storage/ai-chat-storage";

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

    const clearFiles = vi.fn();
    const getUploadedImageIds = vi.fn().mockReturnValue([]);
    const textareaRef = { current: document.createElement("textarea") };

    const { result } = renderHook(() =>
      useAiMessageSender({
        client: mockClient,
        messages,
        setMessages,
        isInitialized: true,
        attachedFiles: [],
        clearFiles,
        getUploadedImageIds,
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
    expect(clearFiles).toHaveBeenCalled();
  });
});
