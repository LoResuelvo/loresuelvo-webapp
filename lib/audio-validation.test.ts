import { describe, expect, it } from "vitest";
import { AUDIO_MAX_BYTES, isSupportedAudioFile, validateAudioFile } from "./audio-validation";

describe("audio validation", () => {
  it.each(["audio/webm", "audio/webm;codecs=opus"])("accepts %s", (type) => {
    expect(isSupportedAudioFile({ type })).toBe(true);
  });

  it.each(["audio/mp4", "audio/ogg", "application/octet-stream", ""])("rejects %s", (type) => {
    expect(isSupportedAudioFile({ type })).toBe(false);
  });

  it("rejects supported audio over 5 MiB", () => {
    expect(validateAudioFile({ type: "audio/webm", size: AUDIO_MAX_BYTES + 1 })).toBe("tooLarge");
  });

  it("accepts supported audio at exactly 5 MiB", () => {
    expect(validateAudioFile({ type: "audio/webm", size: AUDIO_MAX_BYTES })).toBeNull();
  });
});
