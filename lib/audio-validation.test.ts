import { describe, expect, it } from "vitest";
import { isSupportedAudioFile } from "./audio-validation";

describe("audio validation", () => {
  it.each(["audio/webm", "audio/webm;codecs=opus"])("accepts %s", (type) => {
    expect(isSupportedAudioFile({ type })).toBe(true);
  });

  it.each(["audio/mp4", "audio/ogg", "application/octet-stream", ""])("rejects %s", (type) => {
    expect(isSupportedAudioFile({ type })).toBe(false);
  });
});
