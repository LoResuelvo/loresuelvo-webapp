import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChatPanel from "@/components/messaging/chat/ChatPanel";

describe("ChatPanel", () => {
  it("renders empty state when no slots are provided", () => {
    render(<ChatPanel />);

    expect(screen.getByText("Selecciona un contacto para ver la conversación")).toBeInTheDocument();
  });

  it("renders custom emptyState when provided", () => {
    render(
      <ChatPanel
        emptyState={<div data-testid="custom-empty">Custom Empty State</div>}
      />
    );

    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    expect(screen.getByText("Custom Empty State")).toBeInTheDocument();
  });

  it("renders header, children, and footer in correct layout", () => {
    render(
      <ChatPanel
        header={<div data-testid="test-header">Header Content</div>}
        footer={<div data-testid="test-footer">Footer Content</div>}
      >
        <div data-testid="test-body">Body Content</div>
      </ChatPanel>
    );

    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.getByTestId("test-header")).toHaveTextContent("Header Content");
    expect(screen.getByTestId("test-body")).toHaveTextContent("Body Content");
    expect(screen.getByTestId("test-footer")).toHaveTextContent("Footer Content");
  });

  it("applies custom className", () => {
    render(
      <ChatPanel
        className="custom-chat-class"
        header={<div>Header</div>}
      >
        <div>Body</div>
      </ChatPanel>
    );

    expect(screen.getByTestId("chat-panel")).toHaveClass("custom-chat-class");
  });
});