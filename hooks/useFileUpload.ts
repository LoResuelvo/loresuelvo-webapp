"use client";

import { useState, useCallback } from "react";
import { prepareFileUploadAction, confirmFileUploadAction } from "@/app/files/actions";
import { storageClient } from "@/infrastructure/storage/storage-client";
import { t } from "@/infrastructure/i18n/translations";
import type { FileUploadPurpose } from "@/ports/files/file-upload-repository";

export interface UploadFileOptions {
  purpose: FileUploadPurpose;
}

export interface UploadedFileResult {
  fileId: string;
  url: string;
  originalName: string;
}

async function uploadSingleFilePipeline(
  file: File,
  options: UploadFileOptions
): Promise<UploadedFileResult> {
  const presignedRes = await prepareFileUploadAction({
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    purpose: options.purpose,
  });
  if (!presignedRes.success) {
    throw new Error(presignedRes.error);
  }
  const presigned = presignedRes.data;

  await storageClient.uploadFile(file, presigned.uploadUrl, presigned.headers);

  const confirmedRes = await confirmFileUploadAction({
    fileId: presigned.fileId,
    storageKey: presigned.storageKey,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (!confirmedRes.success) {
    throw new Error(confirmedRes.error);
  }
  const confirmed = confirmedRes.data;

  return {
    fileId: confirmed.fileId,
    url: confirmed.url,
    originalName: confirmed.originalName || file.name,
  };
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const uploadFile = useCallback(
    async (file: File, options: UploadFileOptions): Promise<UploadedFileResult> => {
      setIsUploading(true);
      setError(null);

      try {
        return await uploadSingleFilePipeline(file, options);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t.fileUpload.singleError;
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const uploadMultipleFiles = useCallback(
    async (files: File[], options: UploadFileOptions): Promise<UploadedFileResult[]> => {
      if (files.length === 0) {
        return [];
      }

      setIsUploading(true);
      setError(null);

      try {
        return await Promise.all(
          files.map((file) => uploadSingleFilePipeline(file, options))
        );
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t.fileUpload.multipleError;
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    error,
    resetError,
  };
}
