const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = 1024 * BYTES_PER_KILOBYTE;

export const DEFAULT_AUDIO_MIME_TYPE = "audio/webm";
export const OPUS_AUDIO_MIME_TYPE = "audio/webm;codecs=opus";
export const DEFAULT_AUDIO_FILENAME = "audio.webm";

export const AUDIO_ALLOWED_MIME_TYPES = [
  OPUS_AUDIO_MIME_TYPE,
  DEFAULT_AUDIO_MIME_TYPE,
] as const;

export const AUDIO_MAX_MEGABYTES = 5;
export const AUDIO_MAX_BYTES = AUDIO_MAX_MEGABYTES * BYTES_PER_MEGABYTE;
export const AUDIO_MAX_DURATION_SECONDS = 300;

export type AudioFileValidationError = "invalidFormat" | "tooLarge";
export type AudioDurationValidationError = "tooLong";

export function isSupportedAudioFile(file: Pick<File, "type">): boolean {
  return AUDIO_ALLOWED_MIME_TYPES.includes(file.type as (typeof AUDIO_ALLOWED_MIME_TYPES)[number]);
}

export function validateAudioFile(
  file: Pick<File, "type" | "size">
): AudioFileValidationError | null {
  if (!isSupportedAudioFile(file)) return "invalidFormat";
  if (file.size > AUDIO_MAX_BYTES) return "tooLarge";
  return null;
}

export function normalizeAudioMimeType(type?: string): string {
  if (!type) return DEFAULT_AUDIO_MIME_TYPE;
  return type.split(";")[0].trim().toLowerCase() || DEFAULT_AUDIO_MIME_TYPE;
}

export function createRecordedAudioFile(blob: Blob, fileName = DEFAULT_AUDIO_FILENAME): File {
  const mimeType = normalizeAudioMimeType(blob.type);
  return new File([blob], fileName, { type: mimeType });
}

export function validateAudioDuration(durationSeconds: number): AudioDurationValidationError | null {
  return durationSeconds > AUDIO_MAX_DURATION_SECONDS ? "tooLong" : null;
}

