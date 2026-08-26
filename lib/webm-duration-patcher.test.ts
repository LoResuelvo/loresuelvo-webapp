import { describe, expect, it } from "vitest";
import { patchWebmDurationBlob, patchWebmDurationBuffer } from "./webm-duration-patcher";

function createTestEbmlElement(id: number, payload: Uint8Array): Uint8Array {
  // Write ID
  const idBytes: number[] = [];
  let tempId = id;
  while (tempId > 0) {
    idBytes.unshift(tempId & 0xff);
    tempId = Math.floor(tempId / 256);
  }

  // Write Size (1-byte vint if size <= 126, 2-byte vint otherwise)
  let sizeBytes: number[] = [];
  if (payload.length <= 126) {
    sizeBytes = [0x80 | payload.length];
  } else {
    sizeBytes = [0x40 | (payload.length >> 8), payload.length & 0xff];
  }

  const result = new Uint8Array(idBytes.length + sizeBytes.length + payload.length);
  result.set(idBytes, 0);
  result.set(sizeBytes, idBytes.length);
  result.set(payload, idBytes.length + sizeBytes.length);
  return result;
}

function buildTestWebmAudioWithoutDuration(): ArrayBuffer {
  // EBML Header (0x1A45DFA3)
  const docType = createTestEbmlElement(0x4282, new TextEncoder().encode("webm"));
  const header = createTestEbmlElement(0x1a45dfa3, docType);

  // Info without duration
  const timecodeScale = createTestEbmlElement(0x2ad7b1, new Uint8Array([0x0f, 0x42, 0x40])); // 1000000
  const info = createTestEbmlElement(0x1549a966, timecodeScale);

  // Tracks with Opus
  const codec = createTestEbmlElement(0x86, new TextEncoder().encode("A_OPUS"));
  const trackEntry = createTestEbmlElement(0xae, codec);
  const tracks = createTestEbmlElement(0x1654ae6b, trackEntry);

  // Segment
  const segmentPayload = new Uint8Array(info.length + tracks.length);
  segmentPayload.set(info, 0);
  segmentPayload.set(tracks, info.length);
  const segment = createTestEbmlElement(0x18538067, segmentPayload);

  // Combined WebM
  const file = new Uint8Array(header.length + segment.length);
  file.set(header, 0);
  file.set(segment, header.length);
  return file.buffer;
}

describe("webm-duration-patcher", () => {
  it("injects duration element 0x4489 into Info segment when missing", () => {
    const original = buildTestWebmAudioWithoutDuration();
    const durationMs = 18000; // 18 seconds

    const patched = patchWebmDurationBuffer(original, durationMs);
    expect(patched.byteLength).toBeGreaterThan(original.byteLength);

    const view = new DataView(patched);
    let foundDuration = false;
    let foundDurationValue = 0;

    for (let i = 0; i < patched.byteLength - 10; i += 1) {
      if (view.getUint8(i) === 0x44 && view.getUint8(i + 1) === 0x89) {
        foundDuration = true;
        const sizeByte = view.getUint8(i + 2);
        expect(sizeByte).toBe(0x88); // 8 bytes float
        foundDurationValue = view.getFloat64(i + 3, false);
        break;
      }
    }

    expect(foundDuration).toBe(true);
    expect(foundDurationValue).toBe(18000);
  });

  it("patches WebM Blob correctly", async () => {
    const original = buildTestWebmAudioWithoutDuration();
    const blob = new Blob([original], { type: "audio/webm" });

    const patchedBlob = await patchWebmDurationBlob(blob, 25000);
    expect(patchedBlob).toBeInstanceOf(Blob);
    expect(patchedBlob.type).toBe("audio/webm");

    const arrayBuffer = await patchedBlob.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(original.byteLength);
  });

  it("returns original buffer when buffer is invalid or duration <= 0", () => {
    const empty = new ArrayBuffer(4);
    expect(patchWebmDurationBuffer(empty, 5000)).toBe(empty);
    expect(patchWebmDurationBuffer(buildTestWebmAudioWithoutDuration(), 0)).toBeDefined();
  });
});
