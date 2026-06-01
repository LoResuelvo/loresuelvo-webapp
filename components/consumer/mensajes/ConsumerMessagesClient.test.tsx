import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConsumerMessagesClient from "@/app/consumer/mensajes/ConsumerMessagesClient";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === "provider_id") return "20";
      return null;
    }),
  })),
  usePathname: vi.fn(() => "/consumer/mensajes"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
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
  });

  it("renders the messages section with contact list", () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          status: "pending",
          counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
          messages: [],
          updated_on: "2026-05-31T12:00:00Z",
        }),
      })
    ) as unknown as typeof fetch;

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );
    expect(screen.getByRole("heading", { name: "Mensajes" })).toBeInTheDocument();
    expect(screen.getAllByText("Carlos Méndez")[0]).toBeInTheDocument();
  });

  it("displays loaded messages from API when selecting a contact", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          status: "pending",
          counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
          messages: [
            { id: 1, sender_role: "consumer", content: "Hola, me gustaría contratarte para el trabajo", created_on: "2026-05-31T12:00:00Z" },
          ],
          updated_on: "2026-05-31T12:00:00Z",
        }),
      })
    ) as unknown as typeof fetch;

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    await waitFor(() => {
      expect(screen.getByText("Hola, me gustaría contratarte para el trabajo")).toBeInTheDocument();
    });
  });

  it("sends a message and displays it optimistically", async () => {
    global.fetch = vi.fn((url: string) => {
      if (typeof url === "string" && url.includes("/messages")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 2,
            conversation_id: 1,
            sender_role: "consumer",
            content: "Nuevo mensaje de prueba",
            created_on: "2026-05-31T12:05:00Z",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          status: "pending",
          counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
          messages: [],
          updated_on: "2026-05-31T12:00:00Z",
        }),
      });
    }) as unknown as typeof fetch;

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    const input = screen.getByPlaceholderText("Escribe un mensaje...");
    fireEvent.change(input, { target: { value: "Nuevo mensaje de prueba" } });

    const sendButton = screen.getByRole("button", { name: "" });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(screen.getByText("Nuevo mensaje de prueba")).toBeInTheDocument();
  });

  it("shows pending notification when contact is pending", () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          status: "pending",
          counterpart: { id: 20, role: "provider", name: "Carlos", surname: "Méndez", category_name: "Plomería" },
          messages: [],
          updated_on: "2026-05-31T12:00:00Z",
        }),
      })
    ) as unknown as typeof fetch;

    render(
      <ConsumerMessagesClient session={mockSession} contacts={mockContacts} />
    );

    expect(screen.getByText("Esperando aceptación")).toBeInTheDocument();
  });
});
