import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessagesList from "@/app/components/messaging/MessagesList";

vi.mock("@/app/components/messaging/MessageBubble", () => ({
  default: vi.fn(({ isOwnMessage, content }) => (
    <div data-testid="message-bubble" data-own={isOwnMessage}>
      {content}
    </div>
  )),
}));

const mockMessages = [
  { id: "1", content: "Hola proveedor", sentAt: "10:30", senderId: "consumer-001" },
  { id: "2", content: "Hola consumidor", sentAt: "10:31", senderId: "provider-001" },
];

describe("MessagesList", () => {
  it("passes myUserId prop to determine own message styling", () => {
    render(
      <MessagesList
        messages={mockMessages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "true");
    expect(bubbles[1]).toHaveAttribute("data-own", "false");
  });

  it("marks provider message as own when myUserId is provider-001", () => {
    render(
      <MessagesList
        messages={mockMessages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="provider-001"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "false");
    expect(bubbles[1]).toHaveAttribute("data-own", "true");
  });

  it("handles senderId as number type", () => {
    const messagesWithNumberSender = [
      { id: "1", content: "Mensaje de consumidor", sentAt: "10:30", senderId: 20 as unknown as string },
      { id: "2", content: "Mensaje de proveedor", sentAt: "10:31", senderId: "provider-001" },
    ];

    render(
      <MessagesList
        messages={messagesWithNumberSender}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="provider-001"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "false");
    expect(bubbles[1]).toHaveAttribute("data-own", "true");
  });

  it("marks message as own when senderId matches myUserId exactly", () => {
    const messages = [
      { id: "1", content: "Yo", sentAt: "10:30", senderId: "consumer-001" },
      { id: "2", content: "Otro", sentAt: "10:31", senderId: "consumer-002" },
    ];

    render(
      <MessagesList
        messages={messages}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles[0]).toHaveAttribute("data-own", "true");
    expect(bubbles[1]).toHaveAttribute("data-own", "false");
  });
});