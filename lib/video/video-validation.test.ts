import { describe, expect, it } from "vitest";
import {
  validateVideoFile,
  validateVideoMetadata,
  isSupportedVideoFile,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_MAX_DIMENSION_PX,
} from "./video-validation";

describe("video-validation", () => {
  describe("isSupportedVideoFile", () => {
    it("accepts video/mp4 MIME type and .mp4 extension", () => {
      expect(isSupportedVideoFile({ type: "video/mp4", name: "video.mp4" })).toBe(true);
      expect(isSupportedVideoFile({ type: "", name: "video.MP4" })).toBe(true);
      expect(isSupportedVideoFile({ type: "video/webm", name: "video.webm" })).toBe(false);
      expect(isSupportedVideoFile({ type: "image/jpeg", name: "photo.jpg" })).toBe(false);
    });
  });

  describe("validateVideoFile", () => {
    it("rejects non-MP4 formats", () => {
      expect(validateVideoFile({ type: "video/webm", size: 1024, name: "video.webm" })).toBe(
        "invalidFormat"
      );
    });

    it("rejects empty files (0 bytes)", () => {
      expect(validateVideoFile({ type: "video/mp4", size: 0, name: "empty.mp4" })).toBe("emptyFile");
    });

    it("accepts files up to 50 MiB exactly", () => {
      expect(validateVideoFile({ type: "video/mp4", size: 1024, name: "small.mp4" })).toBeNull();
      expect(
        validateVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES, name: "max.mp4" })
      ).toBeNull();
    });

    it("rejects files strictly greater than 50 MiB", () => {
      expect(
        validateVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES + 1, name: "too-large.mp4" })
      ).toBe("tooLarge");
    });
  });

  describe("validateVideoMetadata", () => {
    it("accepts valid dimensions and duration up to 120s and 1920px", () => {
      expect(
        validateVideoMetadata({ duration: 17, width: 1920, height: 1080 })
      ).toBeNull();
      expect(
        validateVideoMetadata({ duration: 17, width: 1080, height: 1920 })
      ).toBeNull();
      expect(
        validateVideoMetadata({ duration: VIDEO_MAX_DURATION_SECONDS, width: 1920, height: 1920 })
      ).toBeNull();
    });

    it("rejects invalid or non-finite metadata as corruptedOrUnreadable", () => {
      expect(validateVideoMetadata({ duration: 0, width: 1920, height: 1080 })).toBe(
        "corruptedOrUnreadable"
      );
      expect(validateVideoMetadata({ duration: -5, width: 1920, height: 1080 })).toBe(
        "corruptedOrUnreadable"
      );
      expect(validateVideoMetadata({ duration: NaN, width: 1920, height: 1080 })).toBe(
        "corruptedOrUnreadable"
      );
      expect(validateVideoMetadata({ duration: Infinity, width: 1920, height: 1080 })).toBe(
        "corruptedOrUnreadable"
      );
      expect(validateVideoMetadata({ duration: 10, width: 0, height: 1080 })).toBe(
        "corruptedOrUnreadable"
      );
      expect(validateVideoMetadata({ duration: 10, width: 1920, height: 0 })).toBe(
        "corruptedOrUnreadable"
      );
    });

    it("rejects duration strictly greater than 120 seconds", () => {
      expect(validateVideoMetadata({ duration: 121, width: 1920, height: 1080 })).toBe(
        "durationTooLong"
      );
      expect(validateVideoMetadata({ duration: 120.1, width: 1920, height: 1080 })).toBe(
        "durationTooLong"
      );
    });

    it("rejects width or height strictly greater than 1920 px", () => {
      expect(
        validateVideoMetadata({ duration: 17, width: VIDEO_MAX_DIMENSION_PX + 1, height: 1080 })
      ).toBe("dimensionsTooLarge");
      expect(
        validateVideoMetadata({ duration: 17, width: 1080, height: VIDEO_MAX_DIMENSION_PX + 1 })
      ).toBe("dimensionsTooLarge");
    });
  });
});
