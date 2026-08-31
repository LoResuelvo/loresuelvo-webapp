"use client";

import { useState, useRef } from "react";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { createAiConversationAction } from "@/app/consumidor/mensajes-ia/actions";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { executeFileUpload } from "@/application/files/execute-file-upload";
import { logger } from "@/infrastructure/logging/logger";

export interface UseInitialDiagnosisReturn {
  message: string;
  setMessage: (value: string) => void;
  isSubmitting: boolean;
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  error: string | null;
  previewImage: { url: string; name: string } | null;
  setPreviewImage: (preview: { url: string; name: string } | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useInitialDiagnosis(): UseInitialDiagnosisReturn {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          setError(t.messaging.fileTooLarge);
          return false;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          setError(t.messaging.photoInvalidFormat);
          return false;
        }

        return true;
      });
      if (validFiles.length > 0) {
        setError(null);
        setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && attachedFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const uploadedImageIds: string[] = [];

    try {
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const confirmed = await executeFileUpload(clientFileUploadRepository, {
            file,
            originalName: file.name,
            mimeType: file.type,
            purpose: "conversation_message_image",
          });
          uploadedImageIds.push(confirmed.fileId);
        }
      }

      const convRes = await createAiConversationAction(
        trimmed,
        uploadedImageIds.length > 0 ? uploadedImageIds : undefined
      );
      if (!convRes.success) throw new Error(convRes.error);

      window.location.href = `${ROUTES.consumer.aiMessages}?id=${convRes.data.id}`;
    } catch (err) {
      logger.debug("[DiagnosisHero] Failed to create conversation:", { err });
      setError(t.aiDiagnosis.errors.startDiagnosis);
      setIsSubmitting(false);
    }
  };

  return {
    message,
    setMessage,
    isSubmitting,
    attachedFiles,
    setAttachedFiles,
    error,
    previewImage,
    setPreviewImage,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    handleSubmit,
  };
}
