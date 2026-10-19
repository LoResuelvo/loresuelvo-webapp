"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { validateClaimImage, CLAIM_MAX_IMAGES } from "@/domain/claim/validation";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { t } from "@/infrastructure/i18n/translations";

export type ClaimEvidenceStatus = "uploading" | "uploaded" | "failed";

export interface ClaimEvidenceItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ClaimEvidenceStatus;
  fileId?: string;
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `claim-evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createPreviewUrl(file: File): string {
  return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
}

function revokePreviewUrl(url: string): void {
  if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}

export function useClaimEvidence() {
  const [items, setItems] = useState<ClaimEvidenceItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const uploadPromises = useRef(new Map<string, Promise<void>>());
  itemsRef.current = items;

  const commit = useCallback((update: (current: ClaimEvidenceItem[]) => ClaimEvidenceItem[]) => {
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const upload = useCallback((item: ClaimEvidenceItem): Promise<void> => {
    const inProgress = uploadPromises.current.get(item.id);
    if (inProgress) return inProgress;

    commit((current) => current.map((entry) =>
      entry.id === item.id ? { ...entry, status: "uploading", fileId: undefined } : entry
    ));

    const request = executeFileUpload(clientFileUploadRepository, {
      file: item.file,
      originalName: item.file.name,
      mimeType: item.file.type,
      purpose: "claim_evidence_image",
    }).then((confirmed) => {
      commit((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: "uploaded", fileId: confirmed.fileId }
        : entry
      ));
    }).catch(() => {
      commit((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: "failed", fileId: undefined }
        : entry
      ));
    }).finally(() => {
      uploadPromises.current.delete(item.id);
    });

    uploadPromises.current.set(item.id, request);
    return request;
  }, [commit]);

  const addFiles = useCallback((files: FileList | File[]) => {
    setValidationError(null);
    const incoming = Array.from(files);
    const available = Math.max(0, CLAIM_MAX_IMAGES - itemsRef.current.length);
    const accepted: ClaimEvidenceItem[] = [];

    for (const file of incoming) {
      if (!validateClaimImage(file)) {
        setValidationError(t.claims.evidenceInvalid);
        continue;
      }
      if (accepted.length >= available) {
        setValidationError(t.claims.evidenceLimit);
        break;
      }
      accepted.push({
        id: createId(),
        file,
        previewUrl: createPreviewUrl(file),
        status: "uploading",
      });
    }

    if (accepted.length === 0) return;
    commit((current) => [...current, ...accepted]);
    accepted.forEach((item) => void upload(item));
  }, [commit, upload]);

  const remove = useCallback((id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (!target) return;
    revokePreviewUrl(target.previewUrl);
    commit((current) => current.filter((item) => item.id !== id));
  }, [commit]);

  const reset = useCallback(() => {
    itemsRef.current.forEach((item) => revokePreviewUrl(item.previewUrl));
    commit(() => []);
    setValidationError(null);
  }, [commit]);

  const ensureUploaded = useCallback(async (): Promise<string[] | null> => {
    const pending = itemsRef.current.map((item) => {
      if (item.status === "uploaded") return Promise.resolve();
      return upload(item);
    });
    await Promise.all(pending);
    const latest = itemsRef.current;
    if (latest.some((item) => item.status !== "uploaded" || !item.fileId)) return null;
    return latest.map((item) => item.fileId as string);
  }, [upload]);

  useEffect(() => () => {
    itemsRef.current.forEach((item) => revokePreviewUrl(item.previewUrl));
  }, []);

  return { items, validationError, addFiles, remove, reset, ensureUploaded };
}
