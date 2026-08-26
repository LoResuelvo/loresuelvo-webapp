import { ApiMessageAudio, ApiMessageImage } from "@/infrastructure/api/types";
import { t } from "@/infrastructure/i18n/translations";

export interface MessagePreviewInput {
  content?: string;
  images?: ApiMessageImage[];
  audio?: ApiMessageAudio;
}

const AUDIO_SEPARATOR = " · ";

function formatAudioDuration(durationSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function isAudioPreview(previewText?: string): boolean {
  if (!previewText) return false;
  return (
    previewText.startsWith(`${t.messaging.audioSidebarPreview.label}${AUDIO_SEPARATOR}`) ||
    previewText === t.messaging.audioSidebarPreview.label
  );
}

export function formatMessagePreview(message?: MessagePreviewInput): string {
  if (!message) return "";

  if (message.audio) {
    return `${t.messaging.audioSidebarPreview.label}${AUDIO_SEPARATOR}${formatAudioDuration(message.audio.duration_seconds)}`;
  }

  if (message.images?.length) {
    return `📷 ${t.messaging.attachedImage}`;
  }

  const content = message.content ?? "";
  return content.length > 40 ? `${content.slice(0, 40)}…` : content;
}
