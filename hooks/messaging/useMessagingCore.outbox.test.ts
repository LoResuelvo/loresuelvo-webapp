import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ConversationDetailInfo } from "@/domain/messaging/types";
import type { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import type { FileRepository } from "@/ports/files/file-repository";
import type { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import { clearDraft, saveDraft } from "@/lib/messaging/message-drafts";
import { useMessagingCore, type BaseConversationContact, type UseMessagingCoreConfig } from "./useMessagingCore";

type DraftSnapshot = { text: string; files: { name: string; size: number; type: string }[] };
const draftStorage: Record<string, DraftSnapshot> = {};
const createObjectUrl = vi.fn(() => "blob:optimistic-audio");
const revokeObjectUrl = vi.fn();

vi.mock("@/infrastructure/websocket", () => ({
  useWebSocket: () => ({ subscribe: vi.fn(() => () => {}), resetUnread: vi.fn() }),
}));

vi.mock("@/lib/messaging/message-drafts", () => ({
  loadDraft: vi.fn((id: string) => draftStorage[id] || { text: "", files: [] }),
  saveDraft: vi.fn((id: string, text: string, files: DraftSnapshot["files"]) => {
    draftStorage[id] = { text, files };
  }),
  clearDraft: vi.fn((id: string) => {
    delete draftStorage[id];
  }),
}));

interface TestContact extends BaseConversationContact {
  providerId: string;
}

const contacts: TestContact[] = [
  { id: "conv-1", providerId: "100", lastMessage: "Hola", lastMessageAt: "10:00" },
];

describe("useMessagingCore outbox", () => {
  let conversationRepository: ConversationCommandRepository;
  let fileRepository: FileRepository;
  let offlineQueueRepository: OfflineQueueRepository;
  let getConversationDetail: Mock<(id: string) => Promise<ConversationDetailInfo>>;

  const createConfig = (): UseMessagingCoreConfig<TestContact> => ({
    session: null,
    myUserId: "user-1",
    myRole: "consumer",
    selectedCounterpartId: "100",
    contacts,
    getCounterpartIdFromContact: (contact) => contact.providerId,
    getConversationDetail,
    conversationRepository,
    fileRepository,
    offlineQueueRepository,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(draftStorage).forEach((id) => delete draftStorage[id]);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    getConversationDetail = vi.fn().mockResolvedValue({
      id: 1,
      status: "active",
      counterpart: { id: 100, role: "provider", name: "Juan", surname: "Perez", categoryName: "Gas" },
      messages: [],
      updatedOn: "2026-05-31T12:00:00Z",
    });
    conversationRepository = {
      create: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({
        id: "2",
        senderId: "user-1",
        content: "Mensaje enviado",
        sentAt: "12:00",
        createdOn: new Date().toISOString(),
      }),
      sendAudioMessage: vi.fn().mockResolvedValue({
        id: "3",
        senderId: "user-1",
        sentAt: "12:00",
        createdOn: new Date().toISOString(),
        audio: {
          id: "audio-1",
          url: "https://files.test/audio.webm",
          originalName: "audio.webm",
          durationSeconds: 1,
          mimeType: "audio/webm",
        },
      }),
    };
    fileRepository = {
      getPresignedUrl: vi.fn().mockResolvedValue({
        file_id: "audio-1",
        key: "audio-key",
        upload_url: "https://upload.test/audio",
        headers: {},
      }),
      uploadFile: vi.fn().mockResolvedValue(undefined),
      confirmUpload: vi.fn().mockResolvedValue({
        id: "audio-1",
        url: "https://files.test/audio.webm",
        original_name: "audio.webm",
      }),
    };
    offlineQueueRepository = {
      loadPendingMessages: vi.fn().mockReturnValue([]),
      savePendingMessages: vi.fn(),
      clearPendingMessages: vi.fn(),
    };
  });

  it("keeps the persisted draft when sending text fails and queues the message", async () => {
    conversationRepository.sendMessage = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useMessagingCore(createConfig()));

    act(() => result.current.setMessageInput("Conservar borrador"));
    await waitFor(() => expect(vi.mocked(saveDraft)).toHaveBeenCalledWith("1", "Conservar borrador", []));
    vi.mocked(clearDraft).mockClear();
    await act(async () => result.current.handleSendMessage());

    expect(result.current.messageInput).toBe("");
    expect(draftStorage["1"]).toEqual({ text: "Conservar borrador", files: [] });
    expect(vi.mocked(clearDraft)).not.toHaveBeenCalledWith("1");
    expect(offlineQueueRepository.savePendingMessages).toHaveBeenCalledWith(
      "1",
      expect.arrayContaining([expect.objectContaining({ content: "Conservar borrador" })])
    );
  });

  it("discards the draft only after a successful text send", async () => {
    const { result } = renderHook(() => useMessagingCore(createConfig()));

    act(() => result.current.setMessageInput("Enviar y borrar"));
    await waitFor(() => expect(draftStorage["1"]?.text).toBe("Enviar y borrar"));
    await act(async () => result.current.handleSendMessage());

    expect(result.current.messageInput).toBe("");
    expect(draftStorage["1"]).toBeUndefined();
    expect(vi.mocked(clearDraft)).toHaveBeenCalledWith("1");
  });

  it("sends audio and revokes its optimistic URL on success", async () => {
    const { result } = renderHook(() => useMessagingCore(createConfig()));
    const file = new File(["audio"], "audio.webm", { type: "audio/webm" });

    await act(async () => expect(await result.current.handleSendAudio(file)).toBe(true));

    expect(conversationRepository.sendAudioMessage).toHaveBeenCalledWith({
      conversationId: "1",
      counterpartId: 100,
      currentUserId: "user-1",
      currentUserRole: "consumer",
      audioFileId: "audio-1",
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:optimistic-audio");
  });

  it("returns the audio failure stage and revokes its optimistic URL", async () => {
    fileRepository.getPresignedUrl = vi.fn().mockRejectedValue(new Error("presign failed"));
    const { result } = renderHook(() => useMessagingCore(createConfig()));
    const file = new File(["audio"], "audio.webm", { type: "audio/webm" });

    await act(async () => expect(await result.current.handleSendAudio(file)).toBe("presign"));

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:optimistic-audio");
    expect(result.current.viewMessages.some((message) => message.audio?.originalName === "audio.webm")).toBe(false);
  });
});
