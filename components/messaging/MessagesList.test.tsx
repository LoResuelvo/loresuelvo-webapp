import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import MessagesList from "@/components/messaging/MessagesList";

vi.mock("@/components/messaging/MessageBubble", () => ({
  default: vi.fn(({ isOwnMessage, content }) => (
    <div data-testid="message-bubble" data-own={isOwnMessage}>
      {content}
    </div>
  )),
}));

const scrollTopState = new WeakMap<HTMLElement, number>();
const originalScrollTopDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTop");

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get(this: HTMLElement) {
      return scrollTopState.get(this) ?? 0;
    },
    set(this: HTMLElement, value: number) {
      scrollTopState.set(this, value);
    },
  });
});

afterAll(() => {
  if (originalScrollTopDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "scrollTop", originalScrollTopDescriptor);
  }
});

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

describe("MessagesList - scroll preservation across conversations", () => {
  function setupScrollMock(el: HTMLElement, scrollHeight: number, clientHeight: number) {
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
    return {
      get: () => scrollTopState.get(el) ?? 0,
      set: (v: number) => { scrollTopState.set(el, v); },
    };
  }

  const buildMessages = (prefix: string) =>
    Array.from({ length: 30 }, (_, i) => ({
      id: `${prefix}-${i}`,
      content: `Mensaje ${prefix} ${i}`,
      sentAt: "10:30",
      senderId: "consumer-001",
    }));

  it("preserves scroll position per conversation across switches", () => {
    const messagesA = buildMessages("a");
    const messagesB = buildMessages("b");

    const { rerender } = render(
      <MessagesList
        conversationId="conv-A"
        messages={messagesA}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    const container = screen.getByTestId("messages-list");
    const scroll = setupScrollMock(container, 1000, 400);

    act(() => {
      scroll.set(200);
      fireEvent.scroll(container);
    });
    expect(scroll.get()).toBe(200);

    rerender(
      <MessagesList
        conversationId="conv-B"
        messages={messagesB}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    act(() => {
      scroll.set(0);
      fireEvent.scroll(container);
    });
    expect(scroll.get()).toBe(0);

    rerender(
      <MessagesList
        conversationId="conv-A"
        messages={messagesA}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    expect(scroll.get()).toBe(200);
  });

  it("preserves scroll position across unmount and remount (e.g. after navigating away and back)", () => {
    const messagesA = buildMessages("z");

    const first = render(
      <MessagesList
        conversationId="conv-unmount-test"
        messages={messagesA}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    const firstContainer = screen.getByTestId("messages-list");
    const firstScroll = setupScrollMock(firstContainer, 1000, 400);

    act(() => {
      firstScroll.set(175);
      fireEvent.scroll(firstContainer);
    });
    expect(firstScroll.get()).toBe(175);

    first.unmount();

    render(
      <MessagesList
        conversationId="conv-unmount-test"
        messages={messagesA}
        expandedMessages={new Set()}
        onToggleExpand={vi.fn()}
        messagesEndRef={{ current: null }}
        showPendingBanner={false}
        myUserId="consumer-001"
      />
    );

    const secondContainer = screen.getByTestId("messages-list");
    const secondScroll = setupScrollMock(secondContainer, 1000, 400);

    expect(secondScroll.get()).toBe(175);
  });

  it("scrolls to bottom when the user sends a message (even if scrolled up)", () => {
    const initialMessages = Array.from({ length: 12 }, (_, i) => ({
      id: `m-${i}`,
      content: `Msg ${i}`,
      sentAt: "10:30",
      senderId: "other-user",
    }));

    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      const { rerender } = render(
        <MessagesList
          conversationId="conv-send-test"
          messages={initialMessages}
          expandedMessages={new Set()}
          onToggleExpand={vi.fn()}
          messagesEndRef={{ current: null }}
          showPendingBanner={false}
          myUserId="consumer-001"
        />
      );

      const container = screen.getByTestId("messages-list");
      const scroll = setupScrollMock(container, 1000, 400);

      act(() => {
        scroll.set(250);
        fireEvent.scroll(container);
      });
      expect(scroll.get()).toBe(250);

      scrollIntoViewMock.mockClear();

      const messagesAfterSend = [
        ...initialMessages,
        { id: "new-1", content: "Mensaje que acabo de enviar", sentAt: "10:31", senderId: "consumer-001" },
      ];

      rerender(
        <MessagesList
          conversationId="conv-send-test"
          messages={messagesAfterSend}
          expandedMessages={new Set()}
          onToggleExpand={vi.fn()}
          messagesEndRef={{ current: null }}
          showPendingBanner={false}
          myUserId="consumer-001"
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});