import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ConversationDetailInfo, Message } from "@/domain/messaging/types";
import type { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import type { FileUploadRepository } from "@/ports/files/file-upload-repository";
import type { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import { useMessagingCore, type BaseConversationContact, type UseMessagingCoreConfig } from "./useMessagingCore";

type DraftSnapshot = { text: string; files: { name: string; size: number; type: string }[] };
type WebSocketEvent = { type: string; conversation_id: number; message: Record<string, unknown> };

let websocketCallback: ((event: WebSocketEvent) => void) | null = null;
const resetUnread = vi.fn();
const draftStorage: Record<string, DraftSnapshot> = {};

vi.mock("@/infrastructure/websocket", () => ({
  useWebSocket: () => ({
    subscribe: vi.fn((callback) => {
      websocketCallback = callback;
      return () => {
        websocketCallback = null;
      };
    }),
    resetUnread,
  }),
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
  providerName: string;
}

const contacts: TestContact[] = [
  { id: "conv-1", providerId: "100", providerName: "Juan", lastMessage: "Hola", lastMessageAt: "10:00" },
  { id: "conv-2", providerId: "200", providerName: "Ana", lastMessage: "Chau", lastMessageAt: "11:00" },
];

describe("useMessagingCore selection and feed", () => {
  let conversationRepository: ConversationCommandRepository;
  let fileRepository: FileUploadRepository;
  let offlineQueueRepository: OfflineQueueRepository;
  let getConversationDetail: Mock<(id: string) => Promise<ConversationDetailInfo>>;
  const dummyDetail: ConversationDetailInfo = {
    id: 1,
    status: "active",
    counterpart: { id: 100, role: "provider", name: "Juan", surname: "Perez", categoryName: "Gas" },
    messages: [{ id: "remote-1", content: "Mensaje existente", senderId: "consumer", sentAt: "10:00" }],
    updatedOn: "2026-05-31T12:00:00Z",
  };

  const createConfig = (
    overrides: Partial<UseMessagingCoreConfig<TestContact>> = {}
  ): UseMessagingCoreConfig<TestContact> => ({
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
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    websocketCallback = null;
    Object.keys(draftStorage).forEach((id) => delete draftStorage[id]);
    getConversationDetail = vi.fn().mockResolvedValue(dummyDetail);
    conversationRepository = {
      create: vi.fn().mockResolvedValue({
        conversationId: "3",
        message: {
          id: "msg-3",
          senderId: "user-1",
          content: "Primer mensaje",
          sentAt: "10:00",
          createdOn: new Date().toISOString(),
        } satisfies Message,
      }),
      sendMessage: vi.fn().mockResolvedValue({
        id: "2",
        senderId: "user-1",
        content: "Enviado",
        sentAt: "10:00",
        createdOn: new Date().toISOString(),
      } satisfies Message),
      sendAudioMessage: vi.fn(),
    };
    fileRepository = {
      prepareUpload: vi.fn(),
      upload: vi.fn(),
      confirmUpload: vi.fn(),
    };
    offlineQueueRepository = {
      loadPendingMessages: vi.fn().mockReturnValue([]),
      savePendingMessages: vi.fn(),
      clearPendingMessages: vi.fn(),
    };
  });

  it("loads a conversation and merges its pending messages", async () => {
    const onConversationLoaded = vi.fn();
    (offlineQueueRepository.loadPendingMessages as Mock).mockReturnValue([
      { id: "pending-1", content: "Sin conexión", senderId: "user-1", sentAt: "Ahora" },
    ]);
    const { result } = renderHook(() => useMessagingCore(createConfig({ onConversationLoaded })));

    await waitFor(() => expect(offlineQueueRepository.clearPendingMessages).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(onConversationLoaded).toHaveBeenCalledWith("1", dummyDetail));

    expect(result.current.selectedContact?.providerName).toBe("Juan");
    expect(result.current.viewMessages.map((message) => message.id)).toEqual(
      expect.arrayContaining(["remote-1", "pending-1"])
    );
  });

  it("restores the draft for each selected conversation", async () => {
    draftStorage["1"] = { text: "Borrador de Juan", files: [] };
    draftStorage["2"] = { text: "Borrador de Ana", files: [] };
    const { result, rerender } = renderHook(
      ({ selectedCounterpartId }) => useMessagingCore(createConfig({ selectedCounterpartId })),
      { initialProps: { selectedCounterpartId: "100" } }
    );

    await waitFor(() => expect(result.current.messageInput).toBe("Borrador de Juan"));
    rerender({ selectedCounterpartId: "200" });
    await waitFor(() => expect(result.current.messageInput).toBe("Borrador de Ana"));
  });

  it("does not append its own realtime message", async () => {
    const onNewIncomingMessage = vi.fn();
    const { result } = renderHook(() => useMessagingCore(createConfig({ onNewIncomingMessage })));

    await waitFor(() => expect(websocketCallback).not.toBeNull());
    act(() => {
      websocketCallback?.({
        type: "conversation.message.created",
        conversation_id: 1,
        message: {
          id: 55,
          sender_role: "consumer",
          content: "Mensaje propio",
          created_on: new Date().toISOString(),
        },
      });
    });

    expect(onNewIncomingMessage).not.toHaveBeenCalled();
    expect(resetUnread).not.toHaveBeenCalled();
    expect(result.current.viewMessages.some((message) => message.content === "Mensaje propio")).toBe(false);
  });

  it("adds a counterpart realtime message only once", async () => {
    const onNewIncomingMessage = vi.fn();
    const { result } = renderHook(() => useMessagingCore(createConfig({ onNewIncomingMessage })));

    await waitFor(() => expect(websocketCallback).not.toBeNull());
    const event = {
      type: "conversation.message.created",
      conversation_id: 1,
      message: {
        id: 56,
        sender_role: "provider",
        content: "Mensaje recibido",
        created_on: new Date().toISOString(),
      },
    };
    act(() => {
      websocketCallback?.(event);
      websocketCallback?.(event);
    });

    expect(onNewIncomingMessage).toHaveBeenCalledTimes(2);
    expect(result.current.viewMessages.filter((message) => message.id === "56")).toHaveLength(1);
  });

  it("toggles expanded messages without changing the public contract", () => {
    const { result } = renderHook(() => useMessagingCore(createConfig()));

    act(() => result.current.toggleMessageExpanded("message-1"));
    expect(result.current.expandedMessages.has("message-1")).toBe(true);
    act(() => result.current.toggleMessageExpanded("message-1"));
    expect(result.current.expandedMessages.has("message-1")).toBe(false);
  });

  it("uses the newly created conversation without reloading it immediately", async () => {
    const newConversationContact = [{ ...contacts[0], id: "conv-new" }];
    const { result } = renderHook(() =>
      useMessagingCore(createConfig({ contacts: newConversationContact }))
    );

    act(() => result.current.setMessageInput("Primer mensaje"));
    await act(async () => result.current.handleSendMessage());

    expect(conversationRepository.create).toHaveBeenCalled();
    expect(result.current.activeConversationId).toBe("3");
    expect(getConversationDetail).not.toHaveBeenCalled();
  });
});
