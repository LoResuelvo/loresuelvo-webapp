import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoUploadError, sendVideoMessage } from "./send-video-message";
import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";

function mockUploadSuccess(fileRepository: FileUploadRepository, fileId = "video-1") {
  vi.mocked(fileRepository.prepareUpload).mockResolvedValue({
    fileId: `upload-${fileId}`,
    storageKey: `conversation_message_video/${fileId}`,
    uploadUrl: "https://upload.test/video",
    headers: { "Content-Type": "video/mp4" },
  });
  vi.mocked(fileRepository.upload).mockResolvedValue(undefined);
  vi.mocked(fileRepository.confirmUpload).mockResolvedValue({
    fileId,
    url: "",
    originalName: "reparacion.mp4",
  });
}

describe("sendVideoMessage", () => {
  let conversationRepository: ConversationCommandRepository;
  let fileRepository: FileUploadRepository;
  const file = new File(["dummy-video-data"], "reparacion.mp4", { type: "video/mp4" });

  beforeEach(() => {
    conversationRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      sendAudioMessage: vi.fn(),
      sendVideoMessage: vi.fn(),
    };
    fileRepository = {
      prepareUpload: vi.fn(),
      upload: vi.fn(),
      confirmUpload: vi.fn(),
    };
  });

  it("presigns, uploads, confirms as video, then sends the video file id with content", async () => {
    mockUploadSuccess(fileRepository, "video-1");
    vi.mocked(conversationRepository.sendVideoMessage).mockResolvedValue({
      id: "101",
      senderId: "consumer-001",
      sentAt: "14:30",
      content: "Así quedó el trabajo",
      video: { id: "video-1", url: "https://cdn.test/reparacion.mp4", originalName: file.name, durationSeconds: 17 },
    });

    const result = await sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "conv-1",
      counterpartId: 2,
      myUserId: "consumer-001",
      file,
      content: "Así quedó el trabajo",
    });

    expect(fileRepository.prepareUpload).toHaveBeenCalledWith({
      originalName: file.name,
      mimeType: "video/mp4",
      sizeBytes: file.size,
      purpose: "conversation_message_video",
    });
    expect(conversationRepository.sendVideoMessage).toHaveBeenCalledWith({
      conversationId: "conv-1",
      counterpartId: 2,
      currentUserId: "consumer-001",
      currentUserRole: "consumer",
      videoFileId: "video-1",
      content: "Así quedó el trabajo",
    });
    expect(result.message.video?.durationSeconds).toBe(17);
  });

  it("sends video without text content when content is empty or whitespace", async () => {
    mockUploadSuccess(fileRepository, "video-2");
    vi.mocked(conversationRepository.sendVideoMessage).mockResolvedValue({
      id: "102",
      senderId: "provider-001",
      sentAt: "14:35",
      video: { id: "video-2", url: "https://cdn.test/video.mp4", originalName: file.name, durationSeconds: 12 },
    });

    await sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "conv-2",
      counterpartId: 5,
      myUserId: "provider-001",
      myRole: "provider",
      file,
      content: "   ",
    });

    expect(conversationRepository.sendVideoMessage).toHaveBeenCalledWith({
      conversationId: "conv-2",
      counterpartId: 5,
      currentUserId: "provider-001",
      currentUserRole: "provider",
      videoFileId: "video-2",
      content: undefined,
    });
  });

  it("throws VideoUploadError with stage presign on prepareUpload failure", async () => {
    vi.mocked(fileRepository.prepareUpload).mockRejectedValue(new Error("Network error"));
    await expect(sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "1", counterpartId: 2, myUserId: "user-1", file,
    })).rejects.toMatchObject({ name: "VideoUploadError", stage: "presign" });
  });

  it("throws VideoUploadError with stage PUT on upload failure", async () => {
    vi.mocked(fileRepository.prepareUpload).mockResolvedValue({
      fileId: "up-1", storageKey: "k", uploadUrl: "https://upload.test", headers: {},
    });
    vi.mocked(fileRepository.upload).mockRejectedValue(new Error("Interrupted"));
    await expect(sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "1", counterpartId: 2, myUserId: "user-1", file,
    })).rejects.toMatchObject({ name: "VideoUploadError", stage: "PUT" });
  });

  it("throws VideoUploadError with stage confirm on confirmUpload failure", async () => {
    vi.mocked(fileRepository.prepareUpload).mockResolvedValue({
      fileId: "up-1", storageKey: "k", uploadUrl: "https://upload.test", headers: {},
    });
    vi.mocked(fileRepository.upload).mockResolvedValue(undefined);
    vi.mocked(fileRepository.confirmUpload).mockRejectedValue(new Error("Confirm failed"));
    await expect(sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "1", counterpartId: 2, myUserId: "user-1", file,
    })).rejects.toMatchObject({ name: "VideoUploadError", stage: "confirm" });
  });

  it("throws VideoUploadError with stage send on sendVideoMessage failure", async () => {
    mockUploadSuccess(fileRepository, "video-fail");
    vi.mocked(conversationRepository.sendVideoMessage).mockRejectedValue(new Error("Server error"));
    await expect(sendVideoMessage(conversationRepository, fileRepository, {
      conversationId: "1", counterpartId: 2, myUserId: "user-1", file,
    })).rejects.toMatchObject({ name: "VideoUploadError", stage: "send" });
  });
});
