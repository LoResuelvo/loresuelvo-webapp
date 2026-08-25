export const AUDIO_ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
] as const;

export function isSupportedAudioFile(file: Pick<File, "type">): boolean {
  return AUDIO_ALLOWED_MIME_TYPES.includes(file.type as (typeof AUDIO_ALLOWED_MIME_TYPES)[number]);
}
