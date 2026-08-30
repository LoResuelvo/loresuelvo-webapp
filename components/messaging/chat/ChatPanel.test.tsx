import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatPanel from "@/components/messaging/chat/ChatPanel";

vi.mock("@/components/messaging/chat/MessageBubble", () => ({
  default: vi.fn(({ isOwnMessage, content }) => (
    <div data-testid="message-bubble" data-own={isOwnMessage}>
      {content}
    </div>
  )),
}));

const mockContact = {
  id: "conv-1",
  providerId: "20",
  providerName: "Carlos",
  providerSurname: "Méndez",
  lastMessage: "Último mensaje",
  lastMessageAt: "10:30",
  pending: false,
};

describe("ChatPanel", () => {
  it("receives myUserId prop and passes it to MessagesList", () => {
    const messages = [
      { id: "1", content: "Hola", sentAt: "10:30", senderId: "consumer-001" },
    ];

    render(
      <ChatPanel
        selectedContact={mockContact}
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="consumer-001"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "true");
  });

  it("renders empty state when no contact selected", () => {
    render(
      <ChatPanel
        selectedContact={null}
        messages={[]}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="consumer-001"
      />
    );

    expect(screen.getByText("Selecciona un contacto para ver la conversación")).toBeInTheDocument();
  });

  it("shows pending banner when contact is pending", () => {
    const pendingContact = { ...mockContact, pending: true };

    render(
      <ChatPanel
        selectedContact={pendingContact}
        messages={[]}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="consumer-001"
      />
    );

    expect(screen.getByText(/Solicitud de contacto enviada/)).toBeInTheDocument();
  });

  it("renders with different myUserId values correctly", () => {
    const messages = [
      { id: "1", content: "Yo", sentAt: "10:30", senderId: "provider-001" },
      { id: "2", content: "Otro", sentAt: "10:31", senderId: "20" },
    ];

    const { rerender } = render(
      <ChatPanel
        selectedContact={mockContact}
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="provider-001"
      />
    );

    let bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "true");
    expect(bubbles[1]).toHaveAttribute("data-own", "false");

    rerender(
      <ChatPanel
        selectedContact={mockContact}
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="20"
      />
    );

    bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "false");
    expect(bubbles[1]).toHaveAttribute("data-own", "true");
  });

  it("renders pending proposal in timeline and opens detail modal on click", () => {
    const proposal = {
      id: 50,
      conversationId: 1,
      amountCents: 4500000,
      scheduledOn: "2026-09-02T10:00:00Z",
      description: "Pintura general",
      estimatedDurationMinutes: 60,
      status: "pending" as const,
      createdOn: "2026-08-18T12:00:00Z",
      counterpart: { id: 20, role: "provider" as const, name: "Carlos", surname: "Méndez" },
    };

    render(
      <ChatPanel
        selectedContact={mockContact}
        messages={[]}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="consumer-001"
        serviceProposal={proposal}
      />,
    );

    expect(screen.getByTestId("service-proposal-panel")).toBeInTheDocument();
    expect(screen.getAllByText("$ 45.000,00")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /ver propuesta de servicio pendiente/i })).toBeInTheDocument();
  });
});