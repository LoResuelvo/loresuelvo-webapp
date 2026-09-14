import { describe, expect, it } from "vitest";
import { formatMessagePreview, isAudioPreview, isVideoPreview } from "./message-preview";

describe("formatMessagePreview", () => {
  it("formats audio duration for the conversation sidebar", () => {
    expect(
      formatMessagePreview({
        audio: {
          id: "audio-1",
          url: "https://signed.test/audio-1",
          original_name: "audio.webm",
          duration_seconds: 18,
        },
      })
    ).toBe("Audio · 0:18");
  });

  it("formats video duration for the conversation sidebar", () => {
    expect(
      formatMessagePreview({
        video: {
          id: "video-1",
          url: "https://signed.test/video-1",
          original_name: "video.mp4",
          duration_seconds: 17,
        },
      })
    ).toBe("Video · 0:17");
  });

  it("identifies audio previews correctly", () => {
    expect(isAudioPreview("Audio · 0:18")).toBe(true);
    expect(isAudioPreview("Hola")).toBe(false);
    expect(isAudioPreview(undefined)).toBe(false);
  });

  it("identifies video previews correctly", () => {
    expect(isVideoPreview("Video · 0:17")).toBe(true);
    expect(isVideoPreview("Hola")).toBe(false);
    expect(isVideoPreview(undefined)).toBe(false);
  });

  it("keeps text and image previews in the same formatter", () => {
    expect(formatMessagePreview({ content: "Hola" })).toBe("Hola");
    expect(
      formatMessagePreview({
        images: [
          {
            id: "image-1",
            url: "https://signed.test/image-1",
            original_name: "image.jpg",
          },
        ],
      })
    ).toBe("📷 Imagen adjunta");
  });
});
