import { describe, expect, it } from "vitest";
import { formatMessagePreview } from "@/lib/message-preview";

describe("formatMessagePreview", () => {
  it("formats audio duration for the conversation sidebar", () => {
    expect(formatMessagePreview({ audio: {
      id: "audio-1",
      url: "https://signed.test/audio-1",
      original_name: "audio.webm",
      duration_seconds: 18,
    } })).toBe("🎤 Audio · 0:18");
  });

  it("keeps text and image previews in the same formatter", () => {
    expect(formatMessagePreview({ content: "Hola" })).toBe("Hola");
    expect(formatMessagePreview({ images: [{
      id: "image-1",
      url: "https://signed.test/image-1",
      original_name: "image.jpg",
    }] })).toBe("📷 Imagen adjunta");
  });
});
