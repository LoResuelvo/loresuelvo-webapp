import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecordingClock } from "./useAudioRecordingClock";

describe("useAudioRecordingClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at 0 and increments elapsed seconds every 1000ms", () => {
    const { result } = renderHook(() => useAudioRecordingClock());

    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSeconds).toBe(5);
  });

  it("pauses ticking and resumes without duplicating intervals", () => {
    const { result } = renderHook(() => useAudioRecordingClock());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      result.current.resume();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedSeconds).toBe(3);
  });

  it("triggers onMaxDuration once when reaching max duration", () => {
    const onMaxDuration = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecordingClock({ maxDurationSeconds: 3, onMaxDuration })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onMaxDuration).toHaveBeenCalledTimes(1);
    expect(result.current.elapsedSeconds).toBe(3);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onMaxDuration).toHaveBeenCalledTimes(1);
  });

  it("calculates accurate duration on stop and freezes elapsed time", () => {
    const { result } = renderHook(() => useAudioRecordingClock());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    let stopResult!: { elapsedSeconds: number; durationMs: number };
    act(() => {
      stopResult = result.current.stop();
    });

    expect(stopResult.elapsedSeconds).toBe(2);
    expect(stopResult.durationMs).toBe(2500);
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsedSeconds).toBe(2);
  });

  it("resets clock to 0 and clears timers", () => {
    const { result } = renderHook(() => useAudioRecordingClock());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.elapsedSeconds).toBe(4);

    act(() => {
      result.current.reset();
    });
    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("cleans up active interval on unmount", () => {
    const { result, unmount } = renderHook(() => useAudioRecordingClock());

    act(() => {
      result.current.start();
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });
});
