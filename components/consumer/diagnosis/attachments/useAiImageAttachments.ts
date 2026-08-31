import { useState, useRef, useEffect, useCallback } from "react";
import type { ConfirmedFileUpload } from "@/ports/files/file-upload-repository";
import type {
  AiImageAttachment,
  UploadingAiImageAttachment,
} from "./ai-image-attachment";

const MAX_ATTACHMENTS = 5;

let idCounter = 0;
function generateAttachmentId(): string {
  idCounter += 1;
  return `attachment-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 9)}`;
}

function createPreviewUrl(file: File): string {
  return typeof window !== "undefined" && window.URL?.createObjectURL
    ? window.URL.createObjectURL(file)
    : "";
}

function revokePreviewUrl(url: string): void {
  if (url && typeof window !== "undefined" && window.URL?.revokeObjectURL) {
    window.URL.revokeObjectURL(url);
  }
}

function createAttachment(file: File): UploadingAiImageAttachment {
  return {
    id: generateAttachmentId(),
    file,
    previewUrl: createPreviewUrl(file),
    status: "uploading",
  };
}

function useAttachmentCollection() {
  const [attachments, setAttachments] = useState<AiImageAttachment[]>([]);
  const attachmentsRef = useRef<AiImageAttachment[]>([]);
  const mountedRef = useRef(true);
  attachmentsRef.current = attachments;

  const commit = useCallback((next: AiImageAttachment[]) => {
    attachmentsRef.current = next;
    if (mountedRef.current) setAttachments(next);
  }, []);

  const currentAttachments = useCallback(() => attachmentsRef.current, []);
  const isMounted = useCallback(() => mountedRef.current, []);
  const isAttachmentActive = useCallback(
    (id: string) => mountedRef.current && attachmentsRef.current.some((item) => item.id === id),
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const current = attachmentsRef.current;
      attachmentsRef.current = [];
      current.forEach((item) => revokePreviewUrl(item.previewUrl));
    };
  }, []);

  return { attachments, commit, currentAttachments, isMounted, isAttachmentActive };
}

function useAttachmentStatusActions(
  replaceAttachment: (id: string, replacement: AiImageAttachment) => void
) {
  const markAttachmentUploaded = useCallback(
    (attachment: UploadingAiImageAttachment, uploaded: ConfirmedFileUpload) => {
      replaceAttachment(attachment.id, { ...attachment, status: "uploaded", uploaded });
    },
    [replaceAttachment]
  );
  const markAttachmentFailed = useCallback(
    (attachment: UploadingAiImageAttachment, error: string) => {
      replaceAttachment(attachment.id, { ...attachment, status: "failed", error });
    },
    [replaceAttachment]
  );
  return { markAttachmentUploaded, markAttachmentFailed };
}

function useAttachmentActions(
  currentAttachments: () => AiImageAttachment[],
  commit: (next: AiImageAttachment[]) => void,
  isMounted: () => boolean
) {
  const addAttachments = useCallback(
    (files: File[]): UploadingAiImageAttachment[] => {
      if (!isMounted()) return [];
      const current = currentAttachments();
      const availableSlots = Math.max(0, MAX_ATTACHMENTS - current.length);
      const added = files.slice(0, availableSlots).map(createAttachment);
      if (added.length > 0) commit([...current, ...added]);
      return added;
    },
    [commit, currentAttachments, isMounted]
  );

  const replaceAttachment = useCallback(
    (id: string, replacement: AiImageAttachment) => {
      if (!isMounted()) return;
      commit(currentAttachments().map((item) => (item.id === id ? replacement : item)));
    },
    [commit, currentAttachments, isMounted]
  );

  const statusActions = useAttachmentStatusActions(replaceAttachment);

  const removeAttachment = useCallback(
    (id: string) => {
      const current = currentAttachments();
      const target = current.find((item) => item.id === id);
      if (!target || !isMounted()) return;
      commit(current.filter((item) => item.id !== id));
      revokePreviewUrl(target.previewUrl);
    },
    [commit, currentAttachments, isMounted]
  );

  const clearAttachments = useCallback(() => {
    const current = currentAttachments();
    commit([]);
    current.forEach((item) => revokePreviewUrl(item.previewUrl));
  }, [commit, currentAttachments]);

  return {
    addAttachments,
    ...statusActions,
    removeAttachment,
    clearAttachments,
  };
}

export function useAiImageAttachments() {
  const collection = useAttachmentCollection();
  const actions = useAttachmentActions(
    collection.currentAttachments,
    collection.commit,
    collection.isMounted
  );
  return {
    attachments: collection.attachments,
    ...actions,
    isAttachmentActive: collection.isAttachmentActive,
  };
}
