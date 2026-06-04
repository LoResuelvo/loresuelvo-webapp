import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProviderMessagesClient from "@/components/provider/mensajes/ProviderMessagesClient";
import * as actions from "@/components/provider/mensajes/actions";

vi.mock("@/lib/websocket", () => ({
  useWebSocket: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
    unreadCount: 0,
    resetUnread: vi.fn(),
  })),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === "consumer_id") return "10";
      return null;
    }),
  })),
  usePathname: vi.fn(() => "/prestador/mensajes"),
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

vi.mock("@/components/provider/mensajes/actions", () => ({
  getConversationDetail: vi.fn(),
  sendMessage: vi.fn(),
  createConversation: vi.fn(),
  acceptJobRequest: vi.fn(),
}));

const mockUser = {
  id: "provider-001",
  email: "carlos@provider.com",
  firstName: "Carlos",
  lastName: "Méndez",
  isOnboarded: true,
  role: "provider" as const,
};

const mockSession = {
  user: mockUser,
  accessToken: "mock-access-token",
};

const mockContacts = [
  {
    id: "conv-1",
    consumerId: "10",
    consumerName: "María",
    consumerSurname: "Fernández",
    lastMessage: "Hola, necesito ayuda",
    lastMessageAt: "10:30",
    pending: true,
  },
];

describe("ProviderMessagesClient handleAccept redirect", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.clearAllMocks();
  });

  it("after clicking accept, calls acceptJobRequest and redirects to chat with consumer", async () => {
    (actions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      status: "pending",
      counterpart: { id: 10, role: "consumer", name: "María", surname: "Fernández", category_name: "Plomería" },
      messages: [],
      updated_on: "2026-05-31T12:00:00Z",
    });

    (actions.acceptJobRequest as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    render(
      <ProviderMessagesClient session={mockSession} contacts={mockContacts} myUserId="provider-001" />
    );

    const acceptButton = screen.getByRole("button", { name: "Aceptar Solicitud" });
    await act(async () => {
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(actions.acceptJobRequest).toHaveBeenCalledWith(1);
    });

    expect(mockPush).toHaveBeenCalledWith("/prestador/mensajes?consumer_id=10");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});