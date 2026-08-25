export const AUDIO_ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
] as const;

export const AUDIO_MAX_BYTES = 5 * 1024 * 1024;

export type AudioFileValidationError = "invalidFormat" | "tooLarge";

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
