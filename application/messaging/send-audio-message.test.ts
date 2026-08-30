import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioUploadError, sendAudioMessage } from "./send-audio-message";
import { AudioConversationRepository } from "@/ports/messaging/audio-conversation-repository";
import { FileRepository } from "@/ports/files/file-repository";

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

  it("normalizes MIME type with codecs parameter to base audio/webm", async () => {
    const file = new File(["audio"], "audio.webm", { type: "audio/webm;codecs=opus" });
    vi.mocked(fileRepository.getPresignedUrl).mockResolvedValue({
      file_id: "upload-2",
      key: "conversation_message_audio/upload-2",
      upload_url: "https://upload.test/audio-2",
      headers: { "Content-Type": "audio/webm" },
    });
    vi.mocked(fileRepository.confirmUpload).mockResolvedValue({
      id: "audio-2",
      url: "https://cdn.test/audio.webm",
      original_name: file.name,
    });
    vi.mocked(conversationRepository.sendAudioMessage).mockResolvedValue({
      id: 100,
      sender_role: "provider",
      created_on: "2026-08-25T21:05:00Z",
      audio: {
        id: "audio-2",
        url: "https://cdn.test/audio.webm",
        original_name: file.name,
        duration_seconds: 10,
        mime_type: "audio/webm",
      },
    });

    await sendAudioMessage(conversationRepository, fileRepository, {
      conversationId: "2",
      counterpartId: 3,
      myUserId: "provider-001",
      file,
      myRole: "provider",
    });

    expect(fileRepository.getPresignedUrl).toHaveBeenCalledWith(
      file.name,
      "audio/webm",
      file.size,
      "conversation_message_audio"
    );
    expect(fileRepository.confirmUpload).toHaveBeenCalledWith(
      "upload-2",
      "conversation_message_audio/upload-2",
      "audio/webm",
      file.size
    );
  });

  it.each([
    ["presign", () => vi.mocked(fileRepository.getPresignedUrl).mockRejectedValue(new Error("presign failed"))],
    ["PUT", () => {
      vi.mocked(fileRepository.getPresignedUrl).mockResolvedValue({
        file_id: "upload-1",
        key: "conversation_message_audio/upload-1",
        upload_url: "https://upload.test/audio",
        headers: {},
      });
      vi.mocked(fileRepository.uploadFile).mockRejectedValue(new Error("upload failed"));
    }],
    ["confirm", () => {
      vi.mocked(fileRepository.getPresignedUrl).mockResolvedValue({
        file_id: "upload-1",
        key: "conversation_message_audio/upload-1",
        upload_url: "https://upload.test/audio",
        headers: {},
      });
      vi.mocked(fileRepository.confirmUpload).mockRejectedValue(new Error("confirm failed"));
    }],
  ] as const)("reports the %s upload stage when it fails", async (stage, configureFailure) => {
    configureFailure();

    await expect(sendAudioMessage(conversationRepository, fileRepository, {
      conversationId: "1",
      counterpartId: 2,
      myUserId: "consumer-001",
      file: new File(["audio"], "ruido-bomba.webm", { type: "audio/webm" }),
    })).rejects.toMatchObject({
      constructor: AudioUploadError,
      stage,
    });
  });
});
