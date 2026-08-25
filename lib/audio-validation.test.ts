import { describe, expect, it } from "vitest";
import {
  AUDIO_MAX_BYTES,
  AUDIO_MAX_DURATION_SECONDS,
  isSupportedAudioFile,
  validateAudioDuration,
  validateAudioFile,
} from "./audio-validation";

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

  it("rejects duration above 300 seconds", () => {
    expect(validateAudioDuration(AUDIO_MAX_DURATION_SECONDS + 1)).toBe("tooLong");
  });

  it("accepts duration at exactly 300 seconds", () => {
    expect(validateAudioDuration(AUDIO_MAX_DURATION_SECONDS)).toBeNull();
  });
});
