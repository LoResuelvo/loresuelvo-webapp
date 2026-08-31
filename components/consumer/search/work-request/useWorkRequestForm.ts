"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Provider } from "@/domain/provider/types";
import { createJobRequest } from "@/app/consumidor/buscar/actions";
import { prepareFileUploadAction, confirmFileUploadAction } from "@/app/files/actions";
import { ROUTES } from "@/lib/routes";
import { t } from "@/infrastructure/i18n/translations";
import { ClientFileUploadRepository } from "@/infrastructure/repositories/files/client-file-upload-repository";

export function parseWorkRequestError(errorMessage: string): string {
  if (errorMessage.includes("Job request already exists") || errorMessage.includes("Conversation already exists")) {
    return t.consumerSearch.form.errorDuplicate;
  }
  if (errorMessage.includes("Only consumers can create job requests")) {
    return t.consumerSearch.form.errorRole;
  }
  if (errorMessage.includes("Provider does not exist")) {
    return t.consumerSearch.form.errorUnavailable;
  }
  if (errorMessage.includes("Title is required") || errorMessage.includes("Provider id is required")) {
    return t.consumerSearch.form.errorMissing;
  }
  return t.consumerSearch.form.errorGeneric;
}

export function useWorkRequestForm(provider: Provider) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError(t.consumerSearch.form.validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const fileRepository = new ClientFileUploadRepository({
      prepareUpload: prepareFileUploadAction,
      confirmUpload: confirmFileUploadAction,
    });
    const uploadedFileIds: string[] = [];

    if (attachedFiles.length > 0) {
      setIsUploading(true);
      try {
        for (const file of attachedFiles) {
          const presigned = await fileRepository.prepareUpload({
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            purpose: "job_request_image",
          });
          await fileRepository.upload({
            uploadUrl: presigned.uploadUrl,
            file,
            headers: presigned.headers,
          });
          const confirm = await fileRepository.confirmUpload({
            fileId: presigned.fileId,
            storageKey: presigned.storageKey,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          uploadedFileIds.push(confirm.fileId);
        }
      } catch (err: unknown) {
        console.error("Error uploading files:", err);
        setError(t.consumerSearch.form.errorUnexpected);
        setIsUploading(false);
        setIsSubmitting(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    try {
      const result = await createJobRequest(
        provider.id,
        title.trim(),
        description.trim(),
        uploadedFileIds.length > 0 ? uploadedFileIds : undefined
      );

      if (!result.success) {
        setError(parseWorkRequestError(result.error));
        setIsSubmitting(false);
        return;
      }

      router.push(
        `${ROUTES.consumer.messages}?provider_id=${provider.id}&name=${encodeURIComponent(provider.name)}&surname=${encodeURIComponent(provider.surname)}`
      );
    } catch (err: unknown) {
      console.error("Unexpected error creating work request:", err);
      setError(t.consumerSearch.form.errorUnexpected);
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    error,
    setError,
    isSubmitting,
    attachedFiles,
    setAttachedFiles,
    isUploading,
    handleSubmit,
  };
}
