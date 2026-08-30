import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartScroll } from "./useSmartScroll";

describe("useSmartScroll", () => {
  it("initializes with isAtBottom as true and returns valid refs", () => {
    const { result } = renderHook(() => useSmartScroll([]));

    expect(result.current.isAtBottom).toBe(true);
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.endRef).toBeDefined();
    expect(typeof result.current.scrollToBottom).toBe("function");
  });

  it("updates isAtBottom when container scrolls near/away from bottom", () => {
    const container = document.createElement("div");
    // Dimensions: scrollHeight 1000, clientHeight 400
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    // Near bottom: scrollTop = 550 => 1000 - 550 - 400 = 50 <= threshold(100)
    container.scrollTop = 550;

    const { result, rerender } = renderHook(() => useSmartScroll([], { threshold: 100 }));

    (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;
    rerender();

    // Simulate scroll event near bottom
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.isAtBottom).toBe(true);

    // Scroll up: scrollTop = 200 => 1000 - 200 - 400 = 400 > 100
    container.scrollTop = 200;
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.isAtBottom).toBe(false);

    // Scroll back down
    container.scrollTop = 520;
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.isAtBottom).toBe(true);
  });

  it("auto-scrolls when deps change and user was at bottom", () => {
    const endElement = document.createElement("div");
    const scrollIntoViewMock = vi.fn();
    endElement.scrollIntoView = scrollIntoViewMock;

    const { result, rerender } = renderHook(
      ({ deps }) => useSmartScroll(deps),
      { initialProps: { deps: ["msg-1"] } }
    );

    (result.current.endRef as React.MutableRefObject<HTMLDivElement | null>).current = endElement;
    scrollIntoViewMock.mockClear();

    // User is at bottom, new message arrives
    rerender({ deps: ["msg-1", "msg-2"] });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("does not auto-scroll when deps change if user scrolled up", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    container.scrollTop = 100; // Scrolled up far from bottom

    const endElement = document.createElement("div");
    const scrollIntoViewMock = vi.fn();
    endElement.scrollIntoView = scrollIntoViewMock;

    const { result, rerender } = renderHook(
      ({ deps }) => useSmartScroll(deps, 100),
      { initialProps: { deps: ["msg-1"] } }
    );

    (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;
    (result.current.endRef as React.MutableRefObject<HTMLDivElement | null>).current = endElement;
    rerender({ deps: ["msg-1"] });

    // Simulate scroll event up
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.isAtBottom).toBe(false);

    scrollIntoViewMock.mockClear();

    // New message arrives while scrolled up
    rerender({ deps: ["msg-1", "msg-2"] });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("manually scrolls to bottom and updates isAtBottom when scrollToBottom is called", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    container.scrollTop = 100;

    const endElement = document.createElement("div");
    const scrollIntoViewMock = vi.fn();
    endElement.scrollIntoView = scrollIntoViewMock;

    const { result, rerender } = renderHook(() => useSmartScroll([]));

    (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;
    (result.current.endRef as React.MutableRefObject<HTMLDivElement | null>).current = endElement;
    rerender();

    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.isAtBottom).toBe(false);

    act(() => {
      result.current.scrollToBottom("instant");
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "instant" });
    expect(result.current.isAtBottom).toBe(true);
  });

  it("falls back to container scrollTop if scrollIntoView is unavailable", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollHeight", { value: 1200, configurable: true });
    container.scrollTop = 0;

    const { result, rerender } = renderHook(() => useSmartScroll([]));

    (result.current.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;
    rerender();

    act(() => {
      result.current.scrollToBottom();
    });

    expect(container.scrollTop).toBe(1200);
    expect(result.current.isAtBottom).toBe(true);
  });
});
