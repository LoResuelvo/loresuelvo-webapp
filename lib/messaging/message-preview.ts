import { ApiMessageAudio, ApiMessageImage, ApiMessageVideo } from "@/infrastructure/api/types";
import { t } from "@/infrastructure/i18n/translations";

export interface MessagePreviewInput {
  content?: string;
  images?: ApiMessageImage[];
  audio?: ApiMessageAudio;
  video?: ApiMessageVideo;
}

const PREVIEW_SEPARATOR = " · ";

function formatDuration(durationSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function isAudioPreview(previewText?: string): boolean {
  if (!previewText) return false;
  return (
    previewText.startsWith(`${t.messaging.audioSidebarPreview.label}${PREVIEW_SEPARATOR}`) ||
    previewText === t.messaging.audioSidebarPreview.label
  );
}

export function isVideoPreview(previewText?: string): boolean {
  if (!previewText) return false;
  return (
    previewText.startsWith(`${t.messaging.videoSidebarPreview.label}${PREVIEW_SEPARATOR}`) ||
    previewText === t.messaging.videoSidebarPreview.label
  );
}

export function formatMessagePreview(message?: MessagePreviewInput): string {
  if (!message) return "";

  if (message.video) {
    return `${t.messaging.videoSidebarPreview.label}${PREVIEW_SEPARATOR}${formatDuration(message.video.duration_seconds)}`;
  }

  if (message.audio) {
    return `${t.messaging.audioSidebarPreview.label}${PREVIEW_SEPARATOR}${formatDuration(message.audio.duration_seconds)}`;
  }

  if (message.images?.length) {
    return `📷 ${t.messaging.attachedImage}`;
  }

  const content = message.content ?? "";
  return content.length > 40 ? `${content.slice(0, 40)}…` : content;
}
