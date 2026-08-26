// EBML & WebM Element IDs
const EBML_HEADER_ID = 0x1a45dfa3;
const SEGMENT_ID = 0x18538067;
const INFO_ID = 0x1549a966;
const TIMECODE_SCALE_ID = 0x2ad7b1;
const DURATION_ID = 0x4489;

// Bitwise & Binary encoding constants
const BITS_PER_BYTE = 8;
const BYTE_MASK = 0xff;
const BYTE_RADIX = 256;
const VINT_MARKER_BIT_MASK = 0x80;
const VINT_MAX_ID_BYTES = 4;
const VINT_MAX_SIZE_BYTES = 8;
const UNKNOWN_SIZE_VINT_VALUE = 0x00ffffffffffffff;

// Timing & Data sizing constants
const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const DEFAULT_TIMECODE_SCALE = 1_000_000; // 1 ms in nanoseconds
const MIN_VALID_WEBM_BYTES = 12;
const FLOAT64_BYTE_LENGTH = 8;
const FLOAT32_BYTE_LENGTH = 4;

// Duration element layout: 2 bytes ID (0x4489) + 1 byte VINT size (0x88 = 8 bytes) + 8 bytes Float64 payload = 11 bytes
const DURATION_VINT_SIZE_OCTET = 0x88;
const DURATION_ELEMENT_TOTAL_BYTES = 11;
const DURATION_PAYLOAD_OFFSET_IN_ELEMENT = 3;
const DURATION_ID_HIGH_BYTE = (DURATION_ID >> BITS_PER_BYTE) & BYTE_MASK;
const DURATION_ID_LOW_BYTE = DURATION_ID & BYTE_MASK;

interface EbmlElementHeader {
  id: number;
  idLength: number;
  size: number;
  sizeLength: number;
  sizeOffset: number;
  payloadStart: number;
  payloadEnd: number;
  isUnknownSize: boolean;
}

interface InfoSegmentMetadata {
  timecodeScale: number;
  durationPayloadStart: number | null;
  durationPayloadLength: number | null;
}

function readVintId(view: DataView, offset: number, end: number): { id: number; length: number } | null {
  if (offset >= end) return null;
  const firstByte = view.getUint8(offset);
  if (firstByte === 0) return null;

  let length = 1;
  let mask = VINT_MARKER_BIT_MASK;
  while ((firstByte & mask) === 0 && length <= VINT_MAX_ID_BYTES) {
    length += 1;
    mask >>= 1;
  }

  if (length > VINT_MAX_ID_BYTES || offset + length > end) return null;

  let id = 0;
  for (let i = 0; i < length; i += 1) {
    id = (id << BITS_PER_BYTE) | view.getUint8(offset + i);
  }

  return { id, length };
}

function readVintSize(
  view: DataView,
  offset: number,
  end: number
): { size: number; length: number; isUnknown: boolean } | null {
  if (offset >= end) return null;
  const firstByte = view.getUint8(offset);
  if (firstByte === 0) return null;

  let length = 1;
  let mask = VINT_MARKER_BIT_MASK;
  while ((firstByte & mask) === 0 && length <= VINT_MAX_SIZE_BYTES) {
    length += 1;
    mask >>= 1;
  }

  if (length > VINT_MAX_SIZE_BYTES || offset + length > end) return null;

  const valueMask = (1 << (BITS_PER_BYTE - length)) - 1;
  let size = firstByte & valueMask;
  for (let i = 1; i < length; i += 1) {
    size = size * BYTE_RADIX + view.getUint8(offset + i);
  }

  const isUnknown = length === VINT_MAX_SIZE_BYTES && size === UNKNOWN_SIZE_VINT_VALUE;
  return { size, length, isUnknown };
}

function writeVintSize(size: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let remainingValue = size;
  for (let i = length - 1; i >= 0; i -= 1) {
    bytes[i] = remainingValue & BYTE_MASK;
    remainingValue = Math.floor(remainingValue / BYTE_RADIX);
  }
  bytes[0] |= 1 << (BITS_PER_BYTE - length);
  return bytes;
}

function readEbmlElementHeader(view: DataView, offset: number, end: number): EbmlElementHeader | null {
  const idResult = readVintId(view, offset, end);
  if (!idResult) return null;

  const sizeOffset = offset + idResult.length;
  const sizeResult = readVintSize(view, sizeOffset, end);
  if (!sizeResult) return null;

  const payloadStart = sizeOffset + sizeResult.length;
  const payloadEnd = sizeResult.isUnknown ? end : payloadStart + sizeResult.size;

  return {
    id: idResult.id,
    idLength: idResult.length,
    size: sizeResult.size,
    sizeLength: sizeResult.length,
    sizeOffset,
    payloadStart,
    payloadEnd,
    isUnknownSize: sizeResult.isUnknown,
  };
}

function findChildElement(
  view: DataView,
  parentStart: number,
  parentEnd: number,
  targetId: number
): EbmlElementHeader | null {
  let offset = parentStart;
  while (offset < parentEnd) {
    const header = readEbmlElementHeader(view, offset, parentEnd);
    if (!header) break;
    if (header.id === targetId) return header;
    offset = header.payloadEnd;
  }
  return null;
}

function parseInfoSegmentMetadata(view: DataView, infoHeader: EbmlElementHeader): InfoSegmentMetadata {
  let offset = infoHeader.payloadStart;
  let timecodeScale = DEFAULT_TIMECODE_SCALE;
  let durationPayloadStart: number | null = null;
  let durationPayloadLength: number | null = null;

  while (offset < infoHeader.payloadEnd) {
    const child = readEbmlElementHeader(view, offset, infoHeader.payloadEnd);
    if (!child) break;

    if (child.id === TIMECODE_SCALE_ID) {
      let scale = 0;
      for (let i = 0; i < child.size; i += 1) {
        scale = (scale << BITS_PER_BYTE) | view.getUint8(child.payloadStart + i);
      }
      if (scale > 0) timecodeScale = scale;
    } else if (child.id === DURATION_ID) {
      durationPayloadStart = child.payloadStart;
      durationPayloadLength = child.size;
    }

    offset = child.payloadEnd;
  }

  return { timecodeScale, durationPayloadStart, durationPayloadLength };
}

function overwriteExistingDuration(
  buffer: ArrayBuffer,
  payloadStart: number,
  payloadLength: number,
  durationValue: number
): ArrayBuffer {
  const patched = buffer.slice(0);
  const patchView = new DataView(patched);
  if (payloadLength === FLOAT64_BYTE_LENGTH) {
    patchView.setFloat64(payloadStart, durationValue, false);
  } else if (payloadLength === FLOAT32_BYTE_LENGTH) {
    patchView.setFloat32(payloadStart, durationValue, false);
  }
  return patched;
}

function createDurationElement(durationValue: number): Uint8Array {
  const element = new Uint8Array(DURATION_ELEMENT_TOTAL_BYTES);
  element[0] = DURATION_ID_HIGH_BYTE;
  element[1] = DURATION_ID_LOW_BYTE;
  element[2] = DURATION_VINT_SIZE_OCTET;
  new DataView(element.buffer).setFloat64(DURATION_PAYLOAD_OFFSET_IN_ELEMENT, durationValue, false);
  return element;
}

function insertDurationElementIntoInfo(
  buffer: ArrayBuffer,
  segmentHeader: EbmlElementHeader,
  infoHeader: EbmlElementHeader,
  durationElement: Uint8Array
): ArrayBuffer {
  const additionalBytes = durationElement.byteLength;
  const newInfoSize = (infoHeader.payloadEnd - infoHeader.payloadStart) + additionalBytes;
  const newInfoSizeBytes = writeVintSize(newInfoSize, infoHeader.sizeLength);

  const newTotalLength = buffer.byteLength + additionalBytes;
  const newBuffer = new Uint8Array(newTotalLength);

  newBuffer.set(new Uint8Array(buffer, 0, infoHeader.payloadStart), 0);
  newBuffer.set(newInfoSizeBytes, infoHeader.sizeOffset);

  if (!segmentHeader.isUnknownSize) {
    const newSegmentSize = segmentHeader.size + additionalBytes;
    const newSegmentSizeBytes = writeVintSize(newSegmentSize, segmentHeader.sizeLength);
    newBuffer.set(newSegmentSizeBytes, segmentHeader.sizeOffset);
  }

  newBuffer.set(durationElement, infoHeader.payloadStart);
  newBuffer.set(new Uint8Array(buffer, infoHeader.payloadStart), infoHeader.payloadStart + additionalBytes);

  return newBuffer.buffer;
}

export function patchWebmDurationBuffer(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  if (buffer.byteLength < MIN_VALID_WEBM_BYTES || durationMs <= 0) {
    return buffer;
  }

  const view = new DataView(buffer);
  const header = readEbmlElementHeader(view, 0, buffer.byteLength);
  if (!header || header.id !== EBML_HEADER_ID) {
    return buffer;
  }

  const segment = readEbmlElementHeader(view, header.payloadEnd, buffer.byteLength);
  if (!segment || segment.id !== SEGMENT_ID) {
    return buffer;
  }

  const info = findChildElement(view, segment.payloadStart, segment.payloadEnd, INFO_ID);
  if (!info) {
    return buffer;
  }

  const { timecodeScale, durationPayloadStart, durationPayloadLength } = parseInfoSegmentMetadata(view, info);
  const durationValue = (durationMs * NANOSECONDS_PER_MILLISECOND) / timecodeScale;

  if (durationPayloadStart !== null && durationPayloadLength !== null) {
    return overwriteExistingDuration(buffer, durationPayloadStart, durationPayloadLength, durationValue);
  }

  const durationElement = createDurationElement(durationValue);
  return insertDurationElementIntoInfo(buffer, segment, info, durationElement);
}

export async function patchWebmDurationBlob(blob: Blob, durationMs: number): Promise<Blob> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const patchedBuffer = patchWebmDurationBuffer(arrayBuffer, durationMs);
    return new Blob([patchedBuffer], { type: "audio/webm" });
  } catch {
    return blob;
  }
}
