"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";
import { logger } from "@/infrastructure/logging/logger";
import { useInitialDiagnosisAttachments } from "./attachments/useInitialDiagnosisAttachments";
import { validateImageFiles } from "./attachments/image-attachment-validation";
import type { InitialDiagnosisAttachment } from "./attachments/initial-diagnosis-attachment";

export interface UseInitialDiagnosisReturn {
  message: string;
  setMessage: (value: string) => void;
  isSubmitting: boolean;
  attachments: InitialDiagnosisAttachment[];
  error: string | null;
  previewImage: { url: string; name: string } | null;
  setPreviewImage: (preview: { url: string; name: string } | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAttachment: (id: string) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useInitialDiagnosis(): UseInitialDiagnosisReturn {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { attachments, addAttachments, removeAttachment, uploadAllPending } =
    useInitialDiagnosisAttachments();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const { validFiles, error: validationError } = validateImageFiles(Array.from(e.target.files));
      setError(validationError);
      if (validFiles.length > 0) addAttachments(validFiles);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addAttachments]
  );

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      const target = attachments.find((a) => a.id === id);
      if (target && previewImage?.url === target.previewUrl) setPreviewImage(null);
      removeAttachment(id);
    },
    [attachments, previewImage, removeAttachment]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && attachments.length === 0) || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await uploadAllPending();
      if (result.status === "cancelled" || !isMountedRef.current) return;

      const imageIds = result.imageIds.length > 0 ? result.imageIds : undefined;
      const convRes = await createAiConversationAction(trimmed, imageIds);
      if (!convRes.success) throw new Error(convRes.error);
      if (!isMountedRef.current) return;

      window.location.href = `${ROUTES.consumer.aiMessages}?id=${convRes.data.id}`;
    } catch (err) {
      logger.debug("[DiagnosisHero] Failed to create conversation:", { err });
      if (!isMountedRef.current) return;
      setError(t.aiDiagnosis.errors.startDiagnosis);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    message,
    setMessage,
    isSubmitting,
    attachments,
    error,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleFileChange,
    handleRemoveAttachment,
    handleSubmit,
  };
}
