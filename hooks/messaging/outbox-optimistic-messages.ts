import type { AuthSession } from "@/infrastructure/auth/types";
import type { Message } from "@/domain/messaging/types";

export function getSenderId(session: AuthSession | null, myUserId: string): string {
  return session?.user?.id ?? myUserId;
}

export function formatTextPreview(content: string): string {
  return content.length > 40 ? `${content.slice(0, 40)}…` : content;
}

export function createOptimisticTextMessage(
  id: string,
  content: string | undefined,
  files: File[],
  senderId: string,
  createdOn: string
): Message {
  return {
    id,
    content,
    senderId,
    sentAt: "Ahora",
    createdOn,
    images: files.map((file) => ({
      id: `temp-img-${Math.random()}`,
      url: URL.createObjectURL(file),
      originalName: file.name,
    })),
  };
}

export function createOptimisticAudioMessage(
  id: string,
  file: File,
  senderId: string,
  createdOn: string,
  url: string
): Message {
  return {
    id,
    senderId,
    sentAt: "Ahora",
    createdOn,
    audio: {
      id,
      url,
      originalName: file.name,
      durationSeconds: 0,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  };
}

export function createOptimisticVideoMessage(
  id: string,
  file: File,
  content: string | undefined,
  senderId: string,
  createdOn: string,
  url: string
): Message {
  return {
    id,
    content,
    senderId,
    sentAt: "Ahora",
    createdOn,
    video: {
      id,
      url,
      originalName: file.name,
      durationSeconds: 17,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  };
}
