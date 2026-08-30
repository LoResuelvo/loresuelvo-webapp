import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/infrastructure/api/base-client";
import { ApiConversationRepository } from "./api-conversation-repository";

vi.mock("@/infrastructure/api/base-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ApiConversationRepository audio messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the discriminated audio payload with snake_case DTO field", async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 99,
      sender_role: "consumer",
      created_on: "2026-08-25T21:00:00Z",
      audio: {
        id: "audio-1",
        url: "https://cdn.test/audio.webm",
        original_name: "audio.webm",
        duration_seconds: 18,
      },
    });

    const result = await new ApiConversationRepository().sendAudioMessage("1", {
      kind: "audio",
      audioFileId: "audio-1",
    });

    expect(api.post).toHaveBeenCalledWith("/conversations/1/messages", {
      audio_file_id: "audio-1",
    });
    expect(result).toMatchObject({
      id: 99,
      audio: { id: "audio-1", duration_seconds: 18 },
    });
  });
});
