import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendAudioMessage } from "./send-audio-message";
import { AudioConversationRepository } from "@/ports/audio-conversation-repository";
import { FileRepository } from "@/ports/file-repository";

describe("sendAudioMessage", () => {
  let conversationRepository: AudioConversationRepository;
  let fileRepository: FileRepository;

  beforeEach(() => {
    conversationRepository = { sendAudioMessage: vi.fn() };
    fileRepository = {
      getPresignedUrl: vi.fn(),
      uploadFile: vi.fn(),
      confirmUpload: vi.fn(),
    };
  });

  it("presigns, uploads, confirms as audio, then sends the audio file id", async () => {
    const file = new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" });
    vi.mocked(fileRepository.getPresignedUrl).mockResolvedValue({
      file_id: "upload-1",
      key: "conversation_message_audio/upload-1",
      upload_url: "https://upload.test/audio",
      headers: { "Content-Type": "audio/webm" },
    });
    vi.mocked(fileRepository.confirmUpload).mockResolvedValue({
      id: "audio-1",
      url: "https://cdn.test/ruido-bomba.webm",
      original_name: file.name,
    });
    vi.mocked(conversationRepository.sendAudioMessage).mockResolvedValue({
      id: 99,
      sender_role: "consumer",
      created_on: "2026-08-25T21:00:00Z",
      audio: {
        id: "audio-1",
        url: "https://cdn.test/ruido-bomba.webm",
        original_name: file.name,
        duration_seconds: 18,
        mime_type: "audio/webm",
      },
    });

    const result = await sendAudioMessage(conversationRepository, fileRepository, {
      conversationId: "1",
      counterpartId: 2,
      myUserId: "consumer-001",
      file,
    });

    expect(fileRepository.getPresignedUrl).toHaveBeenCalledWith(
      file.name,
      "audio/webm",
      file.size,
      "conversation_message_audio"
    );
    expect(fileRepository.uploadFile).toHaveBeenCalledWith(
      "https://upload.test/audio",
      file,
      { "Content-Type": "audio/webm" }
    );
    expect(fileRepository.confirmUpload).toHaveBeenCalledWith(
      "upload-1",
      "conversation_message_audio/upload-1",
      "audio/webm",
      file.size
    );
    expect(conversationRepository.sendAudioMessage).toHaveBeenCalledWith("1", {
      kind: "audio",
      audioFileId: "audio-1",
    });
    expect(result.message.audio?.durationSeconds).toBe(18);
    expect(result.message.audio?.originalName).toBe(file.name);
  });
});
