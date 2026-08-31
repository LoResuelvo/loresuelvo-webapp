import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendMessageWithAttachments } from "./send-message-with-attachments";
import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileRepository } from "@/ports/files/file-repository";
import { Message } from "@/domain/messaging/types";

describe("sendMessageWithAttachments", () => {
  let mockConversationRepository: ConversationCommandRepository;
  let mockFileRepository: FileRepository;

  beforeEach(() => {
    mockConversationRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      sendAudioMessage: vi.fn(),
    };

    mockFileRepository = {
      getPresignedUrl: vi.fn(),
      confirmUpload: vi.fn(),
      uploadFile: vi.fn(),
    };
  });

  it("sends a simple message without attachments to an existing conversation", async () => {
    const dummyMessage: Message = {
      id: "100",
      senderId: "user-1",
      content: "Hello there",
      sentAt: "12:00",
      createdOn: "2026-06-16T12:00:00Z",
    };

    vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue(dummyMessage);

    const res = await sendMessageWithAttachments(
      mockConversationRepository,
      mockFileRepository,
      {
        conversationId: "123",
        counterpartId: 99,
        myUserId: "user-1",
        myRole: "consumer",
        content: "Hello there",
      }
    );

    expect(res.conversationId).toBe("123");
    expect(res.message).toEqual(dummyMessage);
    expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith({
      conversationId: "123",
      counterpartId: 99,
      currentUserId: "user-1",
      currentUserRole: "consumer",
      content: "Hello there",
      imageFileIds: undefined,
    });
    expect(mockFileRepository.getPresignedUrl).not.toHaveBeenCalled();
  });

  it("creates a conversation first if conversationId is not provided", async () => {
    const dummyMessage: Message = {
      id: "456",
      senderId: "user-1",
      content: "First message",
      sentAt: "12:00",
      createdOn: "2026-06-16T12:00:00Z",
    };

    vi.mocked(mockConversationRepository.create).mockResolvedValue({
      conversationId: "456",
      message: dummyMessage,
    });

    const res = await sendMessageWithAttachments(
      mockConversationRepository,
      mockFileRepository,
      {
        conversationId: null,
        counterpartId: 99,
        myUserId: "user-1",
        myRole: "consumer",
        content: "First message",
      }
    );

    expect(res.conversationId).toBe("456");
    expect(res.message).toEqual(dummyMessage);
    expect(mockConversationRepository.create).toHaveBeenCalledWith({
      counterpartId: 99,
      currentUserId: "user-1",
      currentUserRole: "consumer",
      content: "First message",
      imageFileIds: undefined,
    });
    expect(mockConversationRepository.sendMessage).not.toHaveBeenCalled();
  });

  it("uploads files and sends a message with attachment IDs", async () => {
    vi.mocked(mockFileRepository.getPresignedUrl).mockResolvedValue({
      file_id: "fid-1",
      key: "key-1",
      upload_url: "http://upload.url",
      headers: { Authorization: "Bearer xyz" },
    });
    vi.mocked(mockFileRepository.confirmUpload).mockResolvedValue({
      id: "img-123",
      url: "http://s3.url/img.png",
      original_name: "test.png",
    });

    const dummyMessage: Message = {
      id: "101",
      senderId: "user-provider-id",
      content: "Here is the photo",
      sentAt: "12:00",
      createdOn: "2026-06-16T12:00:00Z",
      images: [{ id: "img-123", url: "http://s3.url/img.png", originalName: "test.png" }],
    };

    vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue(dummyMessage);

    const file = new File(["dummy content"], "test.png", { type: "image/png" });

    const res = await sendMessageWithAttachments(
      mockConversationRepository,
      mockFileRepository,
      {
        conversationId: "123",
        counterpartId: 99,
        myUserId: "user-provider-id",
        myRole: "provider",
        content: "Here is the photo",
        files: [file],
      }
    );

    expect(res.conversationId).toBe("123");
    expect(res.message).toEqual(dummyMessage);
    expect(mockFileRepository.getPresignedUrl).toHaveBeenCalledWith("test.png", "image/png", file.size, "conversation_message_image");
    expect(mockFileRepository.uploadFile).toHaveBeenCalledWith("http://upload.url", file, { Authorization: "Bearer xyz" });
    expect(mockFileRepository.confirmUpload).toHaveBeenCalledWith("fid-1", "key-1", "image/png", file.size);
    expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith({
      conversationId: "123",
      counterpartId: 99,
      currentUserId: "user-provider-id",
      currentUserRole: "provider",
      content: "Here is the photo",
      imageFileIds: ["img-123"],
    });
  });
});
