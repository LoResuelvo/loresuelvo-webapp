import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendMessageWithAttachments } from "./send-message-with-attachments";
import { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { FileUploadRepository } from "@/ports/files/file-upload-repository";
import { Message } from "@/domain/messaging/types";

describe("sendMessageWithAttachments", () => {
  let mockConversationRepository: ConversationCommandRepository;
  let mockFileRepository: FileUploadRepository;

  beforeEach(() => {
    mockConversationRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      sendAudioMessage: vi.fn(),
    };

    mockFileRepository = {
      prepareUpload: vi.fn(),
      upload: vi.fn(),
      confirmUpload: vi.fn(),
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
    expect(mockFileRepository.prepareUpload).not.toHaveBeenCalled();
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
    vi.mocked(mockFileRepository.prepareUpload).mockResolvedValue({
      fileId: "fid-1",
      storageKey: "key-1",
      uploadUrl: "http://upload.url",
      headers: { Authorization: "Bearer xyz" },
    });
    vi.mocked(mockFileRepository.confirmUpload).mockResolvedValue({
      fileId: "img-123",
      url: "http://s3.url/img.png",
      originalName: "test.png",
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
    expect(mockFileRepository.prepareUpload).toHaveBeenCalledWith({
      originalName: "test.png",
      mimeType: "image/png",
      sizeBytes: file.size,
      purpose: "conversation_message_image",
    });
    expect(mockFileRepository.upload).toHaveBeenCalledWith({
      uploadUrl: "http://upload.url",
      file,
      headers: { Authorization: "Bearer xyz" },
    });
    expect(mockFileRepository.confirmUpload).toHaveBeenCalledWith({
      fileId: "fid-1",
      storageKey: "key-1",
      mimeType: "image/png",
      sizeBytes: file.size,
    });
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
