import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecorder } from "./useAudioRecorder";
import * as webmPatcher from "@/lib/audio/webm-duration-patcher";

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  static instances: MockMediaRecorder[] = [];
  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly mimeType: string;
  autoEmitStop = true;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "";
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    if (this.autoEmitStop) {
      this.onstop?.();
    }
  }

  emitStop() {
    this.onstop?.();
  }

  emitData(blob: Blob) {
    this.ondataavailable?.({ data: blob } as BlobEvent);
  }
}

function mockMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

describe("useAudioRecorder", () => {
  let tracks: { stop: ReturnType<typeof vi.fn> }[];
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    tracks = [{ stop: vi.fn() }];
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    MockMediaRecorder.instances = [];
    MockMediaRecorder.isTypeSupported.mockReturnValue(true);
    getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => tracks,
    });
    mockMediaDevices(getUserMedia);
    global.URL.createObjectURL = vi.fn(() => "blob:recorded");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requests the microphone, records WebM/Opus, counts and stops cleanly", async () => {
    const { result } = renderHook(() => useAudioRecorder({ maxDurationSeconds: 5 }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.elapsedSeconds).toBe(2);

    expect(MockMediaRecorder.instances[0].mimeType).toBe("audio/webm;codecs=opus");
    expect(MockMediaRecorder.instances[0].state).toBe("recording");
  });

  it("returns a preview URL after stop and revokes it on cancellation", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      MockMediaRecorder.instances[0].emitData(new Blob(["audio"]));
      result.current.stopRecording();
    });

    expect(result.current.audioBlob).toBeInstanceOf(Blob);
    expect(result.current.audioFile).toBeInstanceOf(File);
    expect(result.current.audioFile?.name).toBe("audio.webm");
    expect(result.current.audioUrl).toBe("blob:recorded");

    act(() => result.current.cancelRecording());
    expect(result.current.audioFile).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:recorded");
  });

  it("keeps elapsedSeconds at 0 when stopRecording is called without an active recording", () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("freezes elapsed timer immediately on stopRecording even when onstop is deferred", async () => {
    const patchSpy = vi.spyOn(webmPatcher, "patchWebmDurationBlob");
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.elapsedSeconds).toBe(2);

    const recorder = MockMediaRecorder.instances[0];
    recorder.autoEmitStop = false;
    recorder.emitData(new Blob(["audio-data"]));

    act(() => {
      result.current.stopRecording();
    });

    // Clock should be frozen immediately upon calling stopRecording
    expect(result.current.isRecording).toBe(false);
    expect(result.current.elapsedSeconds).toBe(2);

    // Advance time during the deferred onstop gap
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.elapsedSeconds).toBe(2);

    // Now emit the deferred onstop event
    act(() => {
      recorder.emitStop();
    });

    expect(result.current.elapsedSeconds).toBe(2);
    expect(result.current.audioUrl).toBe("blob:recorded");
    // Verify duration passed to patcher matches the stop time (~2000ms), not the delayed 7000ms
    expect(patchSpy).toHaveBeenCalledWith(expect.any(Blob), 2000);
  });

  it("keeps elapsedSeconds at 0 when cancelled with immediate or deferred onstop", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.elapsedSeconds).toBe(3);

    const recorder = MockMediaRecorder.instances[0];
    recorder.autoEmitStop = false;
    recorder.emitData(new Blob(["audio-data"]));

    act(() => {
      result.current.cancelRecording();
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.audioUrl).toBeNull();

    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.elapsedSeconds).toBe(0);

    // Deferred onstop arrives
    act(() => {
      recorder.emitStop();
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.audioBlob).toBeNull();
  });

  it("reports unsupported WebM/Opus without requesting permission", async () => {
    MockMediaRecorder.isTypeSupported.mockReturnValue(false);
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe("unsupported");
    expect(result.current.audioUrl).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("reports denied microphone permission without creating a preview", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toBe("permissionDenied");
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
  });

  it("stops automatically at the configured duration and releases the stream", async () => {
    const { result } = renderHook(() => useAudioRecorder({ maxDurationSeconds: 2 }));

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      MockMediaRecorder.instances[0].emitData(new Blob(["audio"]));
    });
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe("maxDuration");
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it("pauses and resumes recording properly", async () => {
    const { result } = renderHook(() => useAudioRecorder({ maxDurationSeconds: 10 }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => result.current.pauseRecording());
    expect(result.current.isPaused).toBe(true);
    expect(MockMediaRecorder.instances[0].state).toBe("paused");

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.elapsedSeconds).toBe(2);

    act(() => result.current.resumeRecording());
    expect(result.current.isPaused).toBe(false);
    expect(MockMediaRecorder.instances[0].state).toBe("recording");

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.elapsedSeconds).toBe(3);
  });

  it("handles MediaRecorder error event by releasing stream and setting recordingFailed error", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    act(() => {
      MockMediaRecorder.instances[0].onerror?.();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.error).toBe("recordingFailed");
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it("handles MediaRecorder constructor failure by stopping stream tracks and returning unsupported error", async () => {
    vi.stubGlobal("MediaRecorder", class FailingMediaRecorder {
      static isTypeSupported = vi.fn(() => true);
      constructor() {
        throw new Error("Constructor failed");
      }
    });

    const { result } = renderHook(() => useAudioRecorder());

    let started: boolean | undefined;
    await act(async () => {
      started = await result.current.startRecording();
    });

    expect(started).toBe(false);
    expect(result.current.error).toBe("unsupported");
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it("sets recordingFailed error when recording is stopped without receiving data chunks", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.error).toBe("recordingFailed");
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioFile).toBeNull();
    expect(result.current.audioUrl).toBeNull();
  });

  it("cleans up stream, timer, and recorder on unmount during active recording", async () => {
    const { result, unmount } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);

    unmount();

    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it("does not create a preview or set audio state when cancelled during recording", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      MockMediaRecorder.instances[0].emitData(new Blob(["audio-data"]));
      result.current.cancelRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioFile).toBeNull();
    expect(result.current.audioUrl).toBeNull();
  });

  it("does not restore cancelled audio if webm duration patch resolves after cancellation", async () => {
    let resolvePatch!: (blob: Blob) => void;
    const patchPromise = new Promise<Blob>((resolve) => {
      resolvePatch = resolve;
    });

    vi.spyOn(webmPatcher, "patchWebmDurationBlob").mockReturnValue(patchPromise);

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      MockMediaRecorder.instances[0].emitData(new Blob(["audio-data"]));
      result.current.stopRecording();
    });

    expect(result.current.audioUrl).toBe("blob:recorded");

    act(() => {
      result.current.cancelRecording();
    });

    expect(result.current.audioUrl).toBeNull();

    // Resolve async patch
    await act(async () => {
      resolvePatch(new Blob(["patched-data"], { type: "audio/webm" }));
    });

    expect(result.current.audioUrl).toBeNull();
    expect(result.current.audioBlob).toBeNull();
  });
});
