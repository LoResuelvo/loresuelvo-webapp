import { useCallback } from "react";
import type { ManagedImageAttachment } from "./managed-image-attachment";
import {
  useAttachmentStorage,
  createAttachmentUrl,
  revokeAttachmentUrl,
} from "./attachment-storage";

const DEFAULT_MAX_ATTACHMENTS = 5;

let idCounter = 0;
export function generateAttachmentId(): string {
  idCounter += 1;
  return `attachment-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface UseManagedImageAttachmentsOptions<T extends ManagedImageAttachment> {
  createAttachment: (base: ManagedImageAttachment) => T;
  maxAttachments?: number;
}

export function useManagedImageAttachments<T extends ManagedImageAttachment>({
  createAttachment,
  maxAttachments = DEFAULT_MAX_ATTACHMENTS,
}: UseManagedImageAttachmentsOptions<T>) {
  const { attachments, attachmentsRef, isMountedRef, commitAttachments } =
    useAttachmentStorage<T>();

  const addAttachments = useCallback(
    (files: File[]): T[] => {
      if (!isMountedRef.current) return [];
      const current = attachmentsRef.current;
      const available = Math.max(0, maxAttachments - current.length);
      const filesToAdd = files.slice(0, available);
      if (filesToAdd.length === 0) return [];

      const newItems: T[] = filesToAdd.map((file) =>
        createAttachment({
          id: generateAttachmentId(),
          file,
          previewUrl: createAttachmentUrl(file),
        })
      );

      commitAttachments([...current, ...newItems]);
      return newItems;
    },
    [attachmentsRef, commitAttachments, createAttachment, isMountedRef, maxAttachments]
  );

  const replaceAttachment = useCallback(
    (id: string, updater: (current: T) => T) => {
      if (!isMountedRef.current) return;
      const current = attachmentsRef.current.find((att) => att.id === id);
      if (!current) return;

      const updated = updater(current);
      commitAttachments(attachmentsRef.current.map((att) => (att.id === id ? updated : att)));
    },
    [attachmentsRef, commitAttachments, isMountedRef]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      if (!isMountedRef.current) return;
      const target = attachmentsRef.current.find((att) => att.id === id);
      if (target?.previewUrl) revokeAttachmentUrl(target.previewUrl);
      commitAttachments(attachmentsRef.current.filter((att) => att.id !== id));
    },
    [attachmentsRef, commitAttachments, isMountedRef]
  );

  const clearAttachments = useCallback(() => {
    if (!isMountedRef.current) return;
    attachmentsRef.current.forEach((att) => revokeAttachmentUrl(att.previewUrl));
    commitAttachments([]);
  }, [attachmentsRef, commitAttachments, isMountedRef]);

  const getSnapshot = useCallback((): T[] => attachmentsRef.current, [attachmentsRef]);

  const isAttachmentActive = useCallback(
    (id: string): boolean =>
      isMountedRef.current && attachmentsRef.current.some((att) => att.id === id),
    [attachmentsRef, isMountedRef]
  );

  const isMounted = useCallback((): boolean => isMountedRef.current, [isMountedRef]);

  return {
    attachments,
    addAttachments,
    replaceAttachment,
    removeAttachment,
    clearAttachments,
    getSnapshot,
    isAttachmentActive,
    isMounted,
  };
}
