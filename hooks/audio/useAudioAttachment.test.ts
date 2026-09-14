import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAudioAttachment } from "./useAudioAttachment";
import type { ChangeEvent } from "react";

describe("useAudioAttachment", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock-audio-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("attaches audio file successfully", () => {
    const onAudioAttached = vi.fn();
    const { result } = renderHook(() => useAudioAttachment({ onAudioAttached }));

    const file = new File(["audio-data"], "test.webm", { type: "audio/webm" });
    const event = {
      target: {
        files: [file],
        value: "test.webm",
      },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleAudioChange(event);
    });

    expect(result.current.attachedAudio).not.toBeNull();
    expect(result.current.attachedAudio?.file.name).toBe("test.webm");
    expect(onAudioAttached).toHaveBeenCalledTimes(1);
  });

  it("removes audio file and revokes url", () => {
    const { result } = renderHook(() => useAudioAttachment());
    const file = new File(["audio-data"], "test.webm", { type: "audio/webm" });
    const event = {
      target: { files: [file], value: "test.webm" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleAudioChange(event);
    });
    expect(result.current.attachedAudio).not.toBeNull();

    act(() => {
      result.current.removeAudio();
    });
    expect(result.current.attachedAudio).toBeNull();
  });

  it("triggers error on invalid audio file format", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAudioAttachment({ onError }));
    const file = new File(["not-audio"], "test.txt", { type: "text/plain" });
    const event = {
      target: { files: [file], value: "test.txt" },
    } as unknown as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleAudioChange(event);
    });

    expect(result.current.attachedAudio).toBeNull();
    expect(onError).toHaveBeenCalled();
  });
});
