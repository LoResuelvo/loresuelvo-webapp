import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendMessageWithAttachments } from "./send-message-with-attachments";
import { ConversationRepository } from "@/ports/conversation-repository";
import { FileRepository } from "@/ports/file-repository";

describe("sendMessageWithAttachments", () => {
  let mockConversationRepository: ConversationRepository;
  let mockFileRepository: FileRepository;

  beforeEach(() => {
    mockConversationRepository = {
      create: vi.fn(),
      sendMessage: vi.fn(),
      getConsumerConversations: vi.fn(),
      getProviderConversations: vi.fn(),
      getById: vi.fn(),
    };

    mockFileRepository = {
      getPresignedUrl: vi.fn(),
      confirmUpload: vi.fn(),
      uploadFile: vi.fn(),
    };
  });

  it("sends a simple message without attachments to an existing conversation", async () => {
    vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue({
      id: 100,
      sender_role: "consumer",
      content: "Hello there",
      created_on: "2026-06-16T12:00:00Z",
    });

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
    expect(res.message.content).toBe("Hello there");
    expect(res.message.senderId).toBe("user-1");
    expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith("123", "Hello there", undefined);
    expect(mockFileRepository.getPresignedUrl).not.toHaveBeenCalled();
  });

  it("creates a conversation first if conversationId is not provided", async () => {
    vi.mocked(mockConversationRepository.create).mockResolvedValue({ id: 456 });

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
    expect(res.message.content).toBe("First message");
    expect(res.message.senderId).toBe("user-1");
    expect(mockConversationRepository.create).toHaveBeenCalledWith({
      counterpart_id: 99,
      content: "First message",
      image_file_ids: undefined,
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
    vi.mocked(mockConversationRepository.sendMessage).mockResolvedValue({
      id: 101,
      sender_role: "provider",
      content: "Here is the photo",
      created_on: "2026-06-16T12:00:00Z",
      images: [{ id: "img-123", url: "http://s3.url/img.png", original_name: "test.png" }],
    });

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
    expect(res.message.images).toHaveLength(1);
    expect(res.message.images?.[0].id).toBe("img-123");
    expect(mockFileRepository.getPresignedUrl).toHaveBeenCalledWith("test.png", "image/png", file.size, "conversation_message_image");
    expect(mockFileRepository.uploadFile).toHaveBeenCalledWith("http://upload.url", file, { Authorization: "Bearer xyz" });
    expect(mockFileRepository.confirmUpload).toHaveBeenCalledWith("fid-1", "key-1", "image/png", file.size);
    expect(mockConversationRepository.sendMessage).toHaveBeenCalledWith("123", "Here is the photo", ["img-123"]);
  });
});
