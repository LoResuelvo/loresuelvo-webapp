import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCarouselNavigation } from "./useCarouselNavigation";

describe("useCarouselNavigation", () => {
  it("initializes with default index 0", () => {
    const { result } = renderHook(() => useCarouselNavigation(3));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.hasNavigation).toBe(true);
  });

  it("reports hasNavigation false when total is 1 or 0", () => {
    const { result: r1 } = renderHook(() => useCarouselNavigation(1));
    expect(r1.current.hasNavigation).toBe(false);

    const { result: r0 } = renderHook(() => useCarouselNavigation(0));
    expect(r0.current.hasNavigation).toBe(false);
  });

  it("handles next and prev navigation with wrapping", () => {
    const { result } = renderHook(() => useCarouselNavigation(3));

    // Next: 0 -> 1
    act(() => {
      result.current.handleNext();
    });
    expect(result.current.currentIndex).toBe(1);

    // Next: 1 -> 2
    act(() => {
      result.current.handleNext();
    });
    expect(result.current.currentIndex).toBe(2);

    // Next: 2 -> 0 (wrap)
    act(() => {
      result.current.handleNext();
    });
    expect(result.current.currentIndex).toBe(0);

    // Prev: 0 -> 2 (wrap)
    act(() => {
      result.current.handlePrev();
    });
    expect(result.current.currentIndex).toBe(2);

    // Prev: 2 -> 1
    act(() => {
      result.current.handlePrev();
    });
    expect(result.current.currentIndex).toBe(1);
  });

  it("navigates to specific index via goToIndex", () => {
    const { result } = renderHook(() => useCarouselNavigation(5));

    act(() => {
      result.current.goToIndex(3);
    });
    expect(result.current.currentIndex).toBe(3);

    // Out of bounds should be ignored
    act(() => {
      result.current.goToIndex(10);
    });
    expect(result.current.currentIndex).toBe(3);

    act(() => {
      result.current.goToIndex(-1);
    });
    expect(result.current.currentIndex).toBe(3);
  });
});
