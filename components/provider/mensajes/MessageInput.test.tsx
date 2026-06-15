import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessageInput, { MessageInputHandle } from "@/components/messaging/MessageInput";

describe("MessageInput", () => {
  it("calls onSend when Enter is pressed", () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        value="Hola mundo"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does not call onSend when Shift+Enter is pressed", () => {
    const onSend = vi.fn();
    render(
      <MessageInput
        value="Hola mundo"
        onChange={vi.fn()}
        onSend={onSend}
        disabled={false}
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("focuses input when focus method is called", () => {
    const ref = { current: null as MessageInputHandle | null };
    const { getByRole } = render(
      <MessageInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
        ref={(el: MessageInputHandle) => { ref.current = el; }}
      />
    );

    ref.current?.focus();
    expect(document.activeElement).toBe(getByRole("textbox"));
  });

  it("expands up to 6 visible lines without internal scroll", () => {
    const sixLines = [
      "Linea 1",
      "Linea 2",
      "Linea 3",
      "Linea 4",
      "Linea 5",
      "Linea 6",
    ].join("\n");

    render(
      <MessageInput
        value={sixLines}
        onChange={vi.fn()}
        onSend={vi.fn()}
        disabled={false}
      />
    );

    const input = screen.getByRole("textbox");
    expect(input.tagName).toBe("TEXTAREA");
    expect(input).toHaveAttribute("rows", "6");
    expect(input).toHaveStyle({ overflowY: "hidden" });
  });
});
