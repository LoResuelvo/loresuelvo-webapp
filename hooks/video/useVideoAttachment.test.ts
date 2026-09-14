import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useVideoAttachment } from "./useVideoAttachment";
import * as videoValidation from "@/lib/video/video-validation";

describe("useVideoAttachment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-video-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with idle state and no attached video", () => {
    const { result } = renderHook(() => useVideoAttachment());
    expect(result.current.state).toBe("idle");
    expect(result.current.attachedVideo).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("attaches a valid video and transitions to ready state", async () => {
    vi.spyOn(videoValidation, "readVideoMetadata").mockResolvedValue({
      duration: 17,
      width: 1920,
      height: 1080,
    });

    const file = new File(["video-bytes"], "perdida.mp4", { type: "video/mp4" });
    const { result } = renderHook(() => useVideoAttachment());

    let success = false;
    await act(async () => {
      success = await result.current.attachVideoFile(file);
    });

    expect(success).toBe(true);
    expect(result.current.state).toBe("ready");
    expect(result.current.attachedVideo).toEqual({
      file,
      url: "blob:mock-video-url",
      duration: 17,
      width: 1920,
      height: 1080,
    });
    expect(result.current.error).toBeNull();
  });

  it("replaces an existing video, revoking the previous URL", async () => {
    vi.spyOn(videoValidation, "readVideoMetadata").mockResolvedValue({
      duration: 17,
      width: 1920,
      height: 1080,
    });

    const file1 = new File(["video-1"], "perdida.mp4", { type: "video/mp4" });
    const file2 = new File(["video-2"], "detalle.mp4", { type: "video/mp4" });

    const { result } = renderHook(() => useVideoAttachment());

    await act(async () => {
      await result.current.attachVideoFile(file1);
    });

    expect(result.current.attachedVideo?.file.name).toBe("perdida.mp4");

    await act(async () => {
      await result.current.attachVideoFile(file2);
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-video-url");
    expect(result.current.attachedVideo?.file.name).toBe("detalle.mp4");
    expect(result.current.state).toBe("ready");
  });

  it("removes video and revokes URL", async () => {
    vi.spyOn(videoValidation, "readVideoMetadata").mockResolvedValue({
      duration: 17,
      width: 1920,
      height: 1080,
    });

    const file = new File(["video-bytes"], "perdida.mp4", { type: "video/mp4" });
    const { result } = renderHook(() => useVideoAttachment());

    await act(async () => {
      await result.current.attachVideoFile(file);
    });

    act(() => {
      result.current.removeVideo();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.attachedVideo).toBeNull();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-video-url");
  });

  it("sets invalid state and error when file validation fails", async () => {
    const file = new File([""], "empty.mp4", { type: "video/mp4" });
    const { result } = renderHook(() => useVideoAttachment());

    let success = true;
    await act(async () => {
      success = await result.current.attachVideoFile(file);
    });

    expect(success).toBe(false);
    expect(result.current.state).toBe("invalid");
    expect(result.current.error).toBe("emptyFile");
    expect(result.current.attachedVideo).toBeNull();
  });

  it("blocks attachment if onBeforeSelect returns false", async () => {
    const onBeforeSelect = vi.fn().mockReturnValue(false);
    const file = new File(["content"], "test.mp4", { type: "video/mp4" });
    const { result } = renderHook(() => useVideoAttachment({ onBeforeSelect }));

    let success = true;
    await act(async () => {
      success = await result.current.attachVideoFile(file);
    });

    expect(success).toBe(false);
    expect(onBeforeSelect).toHaveBeenCalled();
    expect(result.current.attachedVideo).toBeNull();
  });
});
