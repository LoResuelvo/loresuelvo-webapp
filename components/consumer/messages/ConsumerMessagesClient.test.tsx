import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConsumerMessagesClient from "@/app/consumidor/mensajes/ConsumerMessagesClient";
import * as actions from "@/app/consumidor/mensajes/actions";

vi.mock("@/lib/websocket", () => ({
  useWebSocket: vi.fn(() => ({
    subscribe: vi.fn(() => vi.fn()),
    unreadCount: 0,
    resetUnread: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === "provider_id") return "20";
      return null;
    }),
  })),
  usePathname: vi.fn(() => "/consumidor/mensajes"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/app/consumidor/mensajes/actions", () => ({
  getConversationDetail: vi.fn(),
  sendMessage: vi.fn(),
  createConversation: vi.fn(),
}));

const mockUser = {
  id: "consumer-001",
  email: "andres@pro.com",
  firstName: "Andres",
  lastName: "Colina",
  isOnboarded: true,
  role: "consumer" as const,
};

const mockSession = {
  user: mockUser,
  accessToken: "mock-access-token",
};

const mockContacts = [
  {
    id: "conv-1",
    providerId: "20",
    providerName: "Carlos",
    providerSurname: "Méndez",
    lastMessage: "Último mensaje",
    lastMessageAt: "10:30",
    pending: true,
  },
];

describe("ConsumerMessagesClient", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
  });

  it("renders the messages section with contact list", async () => {
    (actions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      status: "pending",
      counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
      messages: [],
      updated_on: "2026-05-31T12:00:00Z",
    });

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );
    expect(screen.getByRole("heading", { name: "Mensajes" })).toBeInTheDocument();
    expect(screen.getAllByText("Carlos Méndez")[0]).toBeInTheDocument();
  });

  it("displays loaded messages from API when selecting a contact", async () => {
    (actions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      status: "pending",
      counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
      messages: [
        { id: 1, sender_role: "consumer", content: "Hola, me gustaría contratarte para el trabajo", created_on: "2026-05-31T12:00:00Z" },
      ],
      updated_on: "2026-05-31T12:00:00Z",
    });

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    await waitFor(() => {
      expect(screen.getByText("Hola, me gustaría contratarte para el trabajo")).toBeInTheDocument();
    });
  });

  it("sends a message and displays it optimistically", async () => {
    (actions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      status: "pending",
      counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
      messages: [],
      updated_on: "2026-05-31T12:00:00Z",
    });

    (actions.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2,
      conversation_id: 1,
      sender_role: "consumer",
      content: "Nuevo mensaje de prueba",
      created_on: "2026-05-31T12:05:00Z",
    });

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    const input = screen.getByPlaceholderText("Escribe un mensaje...");
    fireEvent.change(input, { target: { value: "Nuevo mensaje de prueba" } });

    const sendButton = screen.getByRole("button", { name: /enviar mensaje/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });
    expect(screen.getAllByText("Nuevo mensaje de prueba").length).toBeGreaterThan(0);
  });

  it("shows pending notification when contact is pending", async () => {
    (actions.getConversationDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      status: "pending",
      counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
      messages: [],
      updated_on: "2026-05-31T12:00:00Z",
    });

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    expect(screen.getByText("Esperando aceptación")).toBeInTheDocument();
  });
});
