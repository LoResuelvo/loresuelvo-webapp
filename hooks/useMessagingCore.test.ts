import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { useMessagingCore, BaseConversationContact } from "./messaging/useMessagingCore";
import { ConversationRepository } from "@/ports/messaging/conversation-repository";
import { AudioConversationRepository } from "@/ports/messaging/audio-conversation-repository";
import { FileRepository } from "@/ports/files/file-repository";
import { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import { ConversationDetailInfo } from "@/domain/messaging/types";

let mockWsCallback: ((event: any) => void) | null = null;
const mockResetUnread = vi.fn();

vi.mock("@/infrastructure/websocket", () => ({
  useWebSocket: () => ({
    subscribe: vi.fn((cb) => {
      mockWsCallback = cb;
      return () => {
        mockWsCallback = null;
      };
    }),
    unreadCount: 0,
    resetUnread: mockResetUnread,
  }),
}));

const mockDraftStorage: Record<string, any> = {};
vi.mock("@/lib/messaging/message-drafts", () => ({
  loadDraft: vi.fn((id: string) => mockDraftStorage[id] || { text: "", files: [] }),
  saveDraft: vi.fn((id: string, text: string, files: any[]) => {
    mockDraftStorage[id] = { text, files };
  }),
  clearDraft: vi.fn((id: string) => {
    delete mockDraftStorage[id];
  }),
}));

interface TestContact extends BaseConversationContact {
  id: string;
  providerId: string;
  providerName: string;
  providerSurname: string;
}

const mockContacts: TestContact[] = [
  {
    id: "conv-1",
    providerId: "100",
    providerName: "Juan",
    providerSurname: "Perez",
    lastMessage: "Hola",
    lastMessageAt: "10:00",
  },
  {
    id: "conv-2",
    providerId: "200",
    providerName: "Ana",
    providerSurname: "Gomez",
    lastMessage: "Chau",
    lastMessageAt: "11:00",
  },
];

describe("useMessagingCore", () => {
  let mockConversationRepo: ConversationRepository & AudioConversationRepository;
  let mockFileRepo: FileRepository;
  let mockOfflineQueueRepo: OfflineQueueRepository;
  let mockGetConversationDetail: Mock<(id: string) => Promise<ConversationDetailInfo>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWsCallback = null;
    Object.keys(mockDraftStorage).forEach((k) => delete mockDraftStorage[k]);

    mockGetConversationDetail = vi.fn().mockResolvedValue({
      id: 1,
      status: "active",
      counterpart: { id: 100, role: "provider", name: "Juan", surname: "Perez", categoryName: "Gas" },
      messages: [
        { id: 1, senderId: "consumer", content: "Mensaje existente", sentAt: "10:00" },
      ],
      updatedOn: "2026-05-31T12:00:00Z",
    });

    mockConversationRepo = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      sendMessage: vi.fn().mockResolvedValue({ id: 2, conversation_id: 1, sender_role: "consumer", content: "Test", created_on: new Date().toISOString() }),
      sendAudioMessage: vi.fn().mockResolvedValue({ id: 3 }),
      getConsumerConversations: vi.fn().mockResolvedValue([]),
      getProviderConversations: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
    };

    mockFileRepo = {
      getPresignedUrl: vi.fn().mockResolvedValue({ fileId: "f1", uploadUrl: "http://upload", key: "k1" }),
      confirmUpload: vi.fn().mockResolvedValue({ fileId: "f1", url: "http://file", originalName: "file.jpg" }),
      uploadFile: vi.fn().mockResolvedValue(undefined),
    };

    mockOfflineQueueRepo = {
      loadPendingMessages: vi.fn().mockReturnValue([]),
      savePendingMessages: vi.fn(),
      clearPendingMessages: vi.fn(),
    };
  });

  it("selects contact and loads conversation detail on mount", async () => {
    const onLoaded = vi.fn();
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: { user: { id: "user-1", email: "test@test.com", firstName: "Test", lastName: "User", isOnboarded: true, role: "consumer" }, accessToken: "tok" },
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
        onConversationLoaded: onLoaded,
      })
    );

    expect(result.current.selectedContact?.providerName).toBe("Juan");
    expect(result.current.effectiveConversationId).toBe("1");

    await waitFor(() => {
      expect(mockGetConversationDetail).toHaveBeenCalledWith("1");
      expect(onLoaded).toHaveBeenCalled();
    });

    expect(result.current.viewMessages.length).toBe(1);
    expect(result.current.viewMessages[0].content).toBe("Mensaje existente");
  });

  it("handles toggle message expanded", () => {
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
      })
    );

    expect(result.current.expandedMessages.has("msg-1")).toBe(false);

    act(() => {
      result.current.toggleMessageExpanded("msg-1");
    });
    expect(result.current.expandedMessages.has("msg-1")).toBe(true);

    act(() => {
      result.current.toggleMessageExpanded("msg-1");
    });
    expect(result.current.expandedMessages.has("msg-1")).toBe(false);
  });

  it("sends message optimistically and resolves successfully", async () => {
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
      })
    );

    act(() => {
      result.current.setMessageInput("Hola Juan!");
    });

    await act(async () => {
      await result.current.handleSendMessage();
    });

    expect(result.current.messageInput).toBe("");
    expect(mockConversationRepo.sendMessage).toHaveBeenCalled();
  });

  it("handles incoming WebSocket message from counterpart", async () => {
    const onIncoming = vi.fn();
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
        onNewIncomingMessage: onIncoming,
      })
    );

    await waitFor(() => {
      expect(mockWsCallback).not.toBeNull();
    });

    act(() => {
      mockWsCallback!({
        type: "conversation.message.created",
        conversation_id: 1,
        message: {
          id: 55,
          conversation_id: 1,
          sender_role: "provider",
          content: "Hola! En qué puedo ayudarte?",
          created_on: new Date().toISOString(),
        },
      });
    });

    expect(onIncoming).toHaveBeenCalled();
    expect(mockResetUnread).toHaveBeenCalled();
    expect(result.current.viewMessages.some((m) => m.content === "Hola! En qué puedo ayudarte?")).toBe(true);
  });

  it("merges queued messages after loading and clears the offline queue", async () => {
    (mockOfflineQueueRepo.loadPendingMessages as Mock).mockReturnValue([
      { id: "pending-1", content: "Sin conexión", senderId: "user-1", sentAt: "Ahora" },
    ]);

    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
      })
    );

    await waitFor(() => expect(mockOfflineQueueRepo.clearPendingMessages).toHaveBeenCalledWith("1"));
    expect(result.current.viewMessages.map((message) => message.id)).toContain("pending-1");
  });

  it("does not append a duplicated realtime message", async () => {
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
      })
    );

    await waitFor(() => expect(mockWsCallback).not.toBeNull());
    const event = {
      type: "conversation.message.created",
      conversation_id: 1,
      message: {
        id: 55,
        conversation_id: 1,
        sender_role: "provider",
        content: "Una sola vez",
        created_on: new Date().toISOString(),
      },
    };

    act(() => {
      mockWsCallback!(event);
      mockWsCallback!(event);
    });

    expect(result.current.viewMessages.filter((message) => message.id === "55")).toHaveLength(1);
  });

  it("queues a failed text message for later delivery", async () => {
    mockConversationRepo.sendMessage = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() =>
      useMessagingCore<TestContact>({
        session: null,
        myUserId: "user-1",
        myRole: "consumer",
        selectedCounterpartId: "100",
        contacts: mockContacts,
        getCounterpartIdFromContact: (c) => c.providerId,
        getConversationDetail: mockGetConversationDetail,
        conversationRepository: mockConversationRepo,
        fileRepository: mockFileRepo,
        offlineQueueRepository: mockOfflineQueueRepo,
      })
    );

    act(() => result.current.setMessageInput("Guardar en cola"));
    await act(async () => result.current.handleSendMessage());

    expect(mockOfflineQueueRepo.savePendingMessages).toHaveBeenCalledWith(
      "1",
      expect.arrayContaining([expect.objectContaining({ content: "Guardar en cola" })])
    );
  });
});
