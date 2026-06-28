import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConsumerMessagesView from "@/components/consumer/messages/ConsumerMessagesView";

vi.mock("@/components/messaging/MessageBubble", () => ({
  default: vi.fn(({ isOwnMessage, content }) => (
    <div data-testid="message-bubble" data-own={isOwnMessage}>
      {content}
    </div>
  )),
}));

vi.mock("@/components/messaging/ContactList", () => ({
  default: vi.fn(() => <div data-testid="contact-list">ContactList</div>),
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

describe("ConsumerMessagesView", () => {
  it("passes senderId from messages to ChatPanel", () => {
    const messages = [
      { id: "1", content: "Mensaje del consumidor", sentAt: "10:30", senderId: "consumer-001" },
      { id: "2", content: "Mensaje del proveedor", sentAt: "10:31", senderId: "20" },
    ];

    render(
      <ConsumerMessagesView
        contacts={[mockContact]}
        selectedContact={mockContact}
        selectedProviderId="20"
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        onContactClick={vi.fn()}
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
    expect(bubbles[1]).toHaveAttribute("data-own", "false");
  });

  it("marks provider message as own when myUserId is provider id", () => {
    const messages = [
      { id: "1", content: "Mensaje del consumidor", sentAt: "10:30", senderId: "consumer-001" },
      { id: "2", content: "Mensaje del proveedor", sentAt: "10:31", senderId: "20" },
    ];

    render(
      <ConsumerMessagesView
        contacts={[mockContact]}
        selectedContact={mockContact}
        selectedProviderId="20"
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        onContactClick={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
        myUserId="20"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "false");
    expect(bubbles[1]).toHaveAttribute("data-own", "true");
  });

  it("renders messages without senderId (fallback behavior)", () => {
    const messagesWithoutSenderId = [
      { id: "1", content: "Mensaje sin senderId", sentAt: "10:30" },
    ];

    render(
      <ConsumerMessagesView
        myUserId="user-id"
        contacts={[mockContact]}
        selectedContact={mockContact}
        selectedProviderId="20"
        messages={messagesWithoutSenderId}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        onContactClick={vi.fn()}
        messagesEndRef={{ current: null }}
        messageInput=""
        onMessageInputChange={vi.fn()}
        onSendMessage={vi.fn()}
        isSending={false}
      />
    );

    expect(screen.getByText("Mensaje sin senderId")).toBeInTheDocument();
  });

  it("handles myUserId prop and passes it correctly to ChatPanel", () => {
    const messages = [
      { id: "1", content: "Yo", sentAt: "10:30", senderId: "consumer-001" },
      { id: "2", content: "Otro", sentAt: "10:31", senderId: "20" },
    ];

    render(
      <ConsumerMessagesView
        contacts={[mockContact]}
        selectedContact={mockContact}
        selectedProviderId="20"
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        onContactClick={vi.fn()}
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
    expect(bubbles[1]).toHaveAttribute("data-own", "false");
  });
});