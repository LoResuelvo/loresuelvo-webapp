import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecorder } from "./useAudioRecorder";

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  static instances: MockMediaRecorder[] = [];
  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly mimeType: string;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "";
    MockMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
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
  const tracks = [{ stop: vi.fn() }];
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
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
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:recorded");
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
});
