import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordedAudioAsset } from "./useRecordedAudioAsset";
import * as webmPatcher from "@/lib/audio/webm-duration-patcher";

describe("useRecordedAudioAsset", () => {
  let createdUrls: string[] = [];
  let urlCounter = 0;

  beforeEach(() => {
    createdUrls = [];
    urlCounter = 0;
    global.URL.createObjectURL = vi.fn((blob: Blob) => {
      urlCounter += 1;
      const url = `blob:test-audio-${urlCounter}`;
      createdUrls.push(url);
      return url;
    });
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets raw blob immediately with preview URL and audioFile", async () => {
    const patchSpy = vi
      .spyOn(webmPatcher, "patchWebmDurationBlob")
      .mockReturnValue(new Promise(() => {})); // pending

    const { result } = renderHook(() => useRecordedAudioAsset());

    const rawBlob = new Blob(["audio-content"], { type: "audio/webm" });

    act(() => {
      result.current.setRecordedBlob(rawBlob, 2000);
    });

    expect(result.current.audioBlob).toBe(rawBlob);
    expect(result.current.audioFile).toBeInstanceOf(File);
    expect(result.current.audioFile?.name).toBe("audio.webm");
    expect(result.current.audioUrl).toBe("blob:test-audio-1");
    expect(patchSpy).toHaveBeenCalledWith(rawBlob, 2000);
  });

  it("replaces raw blob with patched blob and updates object URL", async () => {
    const patchedBlob = new Blob(["patched-audio"], { type: "audio/webm" });
    vi.spyOn(webmPatcher, "patchWebmDurationBlob").mockResolvedValueOnce(patchedBlob);

    const { result } = renderHook(() => useRecordedAudioAsset());

    const rawBlob = new Blob(["audio-content"], { type: "audio/webm" });

    await act(async () => {
      result.current.setRecordedBlob(rawBlob, 2000);
    });

    expect(result.current.audioBlob).toBe(patchedBlob);
    expect(result.current.audioFile).toBeInstanceOf(File);
    expect(result.current.audioUrl).toBe("blob:test-audio-2");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-audio-1");
  });

  it("clears audio state and revokes URL on clearAudio", () => {
    vi.spyOn(webmPatcher, "patchWebmDurationBlob").mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRecordedAudioAsset());

    const rawBlob = new Blob(["audio-content"], { type: "audio/webm" });

    act(() => {
      result.current.setRecordedBlob(rawBlob, 2000);
    });

    expect(result.current.audioUrl).toBe("blob:test-audio-1");

    act(() => {
      result.current.clearAudio();
    });

    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioFile).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-audio-1");
  });

  it("discards delayed patch if clearAudio was called in the meantime", async () => {
    let resolvePatch!: (blob: Blob) => void;
    const patchPromise = new Promise<Blob>((resolve) => {
      resolvePatch = resolve;
    });
    vi.spyOn(webmPatcher, "patchWebmDurationBlob").mockReturnValue(patchPromise);

    const { result } = renderHook(() => useRecordedAudioAsset());

    const rawBlob = new Blob(["audio-content"], { type: "audio/webm" });

    act(() => {
      result.current.setRecordedBlob(rawBlob, 2000);
    });

    act(() => {
      result.current.clearAudio();
    });

    expect(result.current.audioUrl).toBeNull();

    await act(async () => {
      resolvePatch(new Blob(["delayed-patched"], { type: "audio/webm" }));
    });

    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioFile).toBeNull();
    expect(result.current.audioUrl).toBeNull();
  });

  it("discards delayed patch if a new recording replaced it", async () => {
    let resolvePatch1!: (blob: Blob) => void;
    let resolvePatch2!: (blob: Blob) => void;
    const patchPromise1 = new Promise<Blob>((resolve) => {
      resolvePatch1 = resolve;
    });
    const patchPromise2 = new Promise<Blob>((resolve) => {
      resolvePatch2 = resolve;
    });

    vi.spyOn(webmPatcher, "patchWebmDurationBlob")
      .mockReturnValueOnce(patchPromise1)
      .mockReturnValueOnce(patchPromise2);

    const { result } = renderHook(() => useRecordedAudioAsset());

    const rawBlob1 = new Blob(["audio-1"], { type: "audio/webm" });
    const rawBlob2 = new Blob(["audio-2"], { type: "audio/webm" });

    act(() => {
      result.current.setRecordedBlob(rawBlob1, 2000);
    });

    expect(result.current.audioUrl).toBe("blob:test-audio-1");

    act(() => {
      result.current.setRecordedBlob(rawBlob2, 4000);
    });

    expect(result.current.audioUrl).toBe("blob:test-audio-2");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-audio-1");

    // Resolve patch 1 late
    await act(async () => {
      resolvePatch1(new Blob(["patched-1"], { type: "audio/webm" }));
    });

    // Should still be audio-2
    expect(result.current.audioBlob).toBe(rawBlob2);
    expect(result.current.audioUrl).toBe("blob:test-audio-2");

    // Resolve patch 2
    const patched2 = new Blob(["patched-2"], { type: "audio/webm" });
    await act(async () => {
      resolvePatch2(patched2);
    });

    expect(result.current.audioBlob).toBe(patched2);
    expect(result.current.audioUrl).toBe("blob:test-audio-3");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-audio-2");
  });

  it("revokes active URL on unmount", () => {
    vi.spyOn(webmPatcher, "patchWebmDurationBlob").mockReturnValue(new Promise(() => {}));

    const { result, unmount } = renderHook(() => useRecordedAudioAsset());

    const rawBlob = new Blob(["audio-content"], { type: "audio/webm" });

    act(() => {
      result.current.setRecordedBlob(rawBlob, 2000);
    });

    expect(result.current.audioUrl).toBe("blob:test-audio-1");

    unmount();

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-audio-1");
  });
});
