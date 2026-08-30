import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoResizeTextarea } from "./useAutoResizeTextarea";

describe("useAutoResizeTextarea", () => {
  it("returns default values with empty initial text", () => {
    const { result } = renderHook(() => useAutoResizeTextarea(""));

    expect(result.current.rows).toBe(1);
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.resetHeight).toBe("function");
  });

  it("calculates rows based on line breaks and constraints", () => {
    const { result, rerender } = renderHook(
      ({ value, options }) => useAutoResizeTextarea(value, options),
      {
        initialProps: {
          value: "Line 1\nLine 2\nLine 3",
          options: { minRows: 1, maxRows: 5, lineHeight: 24 },
        },
      }
    );

    expect(result.current.rows).toBe(3);

    // Exceeds maxRows
    rerender({
      value: "1\n2\n3\n4\n5\n6\n7\n8",
      options: { minRows: 1, maxRows: 5, lineHeight: 24 },
    });
    expect(result.current.rows).toBe(5);

    // Below minRows
    rerender({
      value: "",
      options: { minRows: 2, maxRows: 5, lineHeight: 24 },
    });
    expect(result.current.rows).toBe(2);
  });

  it("adjusts textarea DOM style and rows when attached", () => {
    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", {
      value: 72,
      configurable: true,
      writable: true,
    });

    const { result, rerender } = renderHook(
      ({ value }) => useAutoResizeTextarea(value, { minRows: 1, maxRows: 5, lineHeight: 24 }),
      { initialProps: { value: "Line 1\nLine 2" } }
    );

    // Attach element to ref
    (result.current.ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textarea;

    // Trigger effect with updated value
    rerender({ value: "Line 1\nLine 2\nLine 3" });

    expect(textarea.rows).toBe(3);
    expect(textarea.style.height).toBe("72px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("sets overflowY to auto when scrollHeight exceeds maxHeight", () => {
    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", {
      value: 200, // maxHeight is 5 * 24 = 120
      configurable: true,
      writable: true,
    });

    const { result, rerender } = renderHook(
      ({ value }) => useAutoResizeTextarea(value, { minRows: 1, maxRows: 5, lineHeight: 24 }),
      { initialProps: { value: "" } }
    );

    (result.current.ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textarea;

    rerender({ value: "1\n2\n3\n4\n5\n6\n7" });

    expect(textarea.rows).toBe(5);
    expect(textarea.style.height).toBe("120px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("resets height and rows to minRows on empty value or resetHeight call", () => {
    const textarea = document.createElement("textarea");
    Object.defineProperty(textarea, "scrollHeight", {
      value: 96,
      configurable: true,
      writable: true,
    });

    const { result, rerender } = renderHook(
      ({ value }) => useAutoResizeTextarea(value, { minRows: 2, maxRows: 5, lineHeight: 24 }),
      { initialProps: { value: "" } }
    );

    (result.current.ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = textarea;

    rerender({ value: "Hello\nWorld\nTest" });
    expect(textarea.rows).toBe(3);

    // Test reset via empty string
    rerender({ value: "   " });
    expect(textarea.rows).toBe(2);
    expect(textarea.style.height).toBe("auto");
    expect(textarea.style.overflowY).toBe("hidden");

    // Modify textarea manually and call resetHeight
    textarea.rows = 4;
    textarea.style.height = "100px";
    textarea.style.overflowY = "auto";

    act(() => {
      result.current.resetHeight();
    });

    expect(textarea.rows).toBe(2);
    expect(textarea.style.height).toBe("auto");
    expect(textarea.style.overflowY).toBe("hidden");
  });
});
