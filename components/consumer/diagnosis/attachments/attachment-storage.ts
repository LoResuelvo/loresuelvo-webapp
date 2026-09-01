import { useState, useRef, useEffect, useCallback } from "react";
import type { ManagedImageAttachment } from "./managed-image-attachment";

export function revokeAttachmentUrl(url: string) {
  if (typeof window !== "undefined" && window.URL?.revokeObjectURL && url) {
    window.URL.revokeObjectURL(url);
  }
}

export function createAttachmentUrl(file: File): string {
  return typeof window !== "undefined" && window.URL?.createObjectURL
    ? window.URL.createObjectURL(file)
    : "";
}

export function useAttachmentStorage<T extends ManagedImageAttachment>() {
  const [attachments, setAttachments] = useState<T[]>([]);
  const attachmentsRef = useRef<T[]>([]);
  attachmentsRef.current = attachments;
  const isMountedRef = useRef(true);

  const commitAttachments = useCallback((next: T[]) => {
    if (!isMountedRef.current) return;
    attachmentsRef.current = next;
    setAttachments(next);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      attachmentsRef.current.forEach((att) => revokeAttachmentUrl(att.previewUrl));
      attachmentsRef.current = [];
    };
  }, []);

  return {
    attachments,
    attachmentsRef,
    isMountedRef,
    commitAttachments,
  };
}
