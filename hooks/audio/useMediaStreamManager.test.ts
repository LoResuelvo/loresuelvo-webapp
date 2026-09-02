import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useMediaStreamManager } from "./useMediaStreamManager";

describe("useMediaStreamManager", () => {
  const tracks = [{ stop: vi.fn() }];
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => tracks,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("acquires audio stream and stores it in streamRef", async () => {
    const { result } = renderHook(() => useMediaStreamManager());

    let stream: MediaStream | null = null;
    await act(async () => {
      stream = await result.current.acquireAudioStream();
    });

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.streamRef.current).toBe(stream);
  });

  it("stops stream tracks when stopStream is called", async () => {
    const { result } = renderHook(() => useMediaStreamManager());

    await act(async () => {
      await result.current.acquireAudioStream();
    });

    act(() => {
      result.current.stopStream();
    });

    expect(tracks[0].stop).toHaveBeenCalled();
    expect(result.current.streamRef.current).toBeNull();
  });

  it("stops tracks automatically on unmount", async () => {
    const { result, unmount } = renderHook(() => useMediaStreamManager());

    await act(async () => {
      await result.current.acquireAudioStream();
    });

    unmount();
    expect(tracks[0].stop).toHaveBeenCalled();
  });
});
