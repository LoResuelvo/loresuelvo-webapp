import { describe, expect, it } from "vitest";
import { shouldShowExpandButton } from "./text-utils";

describe("shouldShowExpandButton", () => {
  it("returns false for short single-line content", () => {
    expect(shouldShowExpandButton("Hello")).toBe(false);
  });

  it("returns false for content just under the threshold", () => {
    const shortContent = "Line one\nLine two\nLine three";
    expect(shouldShowExpandButton(shortContent)).toBe(false);
  });

  it("returns true for content with many newlines", () => {
    const longContent = "Line\n".repeat(10);
    expect(shouldShowExpandButton(longContent)).toBe(true);
  });

  it("returns true for very long single-line content", () => {
    const longContent = "a".repeat(300);
    expect(shouldShowExpandButton(longContent)).toBe(true);
  });

  it("accepts custom maxCharsPerLine and maxVisibleLines", () => {
    const content = "a".repeat(100);
    // With 100 chars per line and 5 max lines: 1 wrapped + 1 explicit = 2, not > 5
    expect(shouldShowExpandButton(content, 100, 5)).toBe(false);
    // With 10 chars per line: 10 wrapped + 1 explicit = 11, > 5
    expect(shouldShowExpandButton(content, 10, 5)).toBe(true);
  });
});
