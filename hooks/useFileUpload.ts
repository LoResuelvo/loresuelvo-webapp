"use client";

import { useState, useCallback } from "react";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";
import { storageClient } from "@/infrastructure/storage/storage-client";
import { t } from "@/infrastructure/i18n/translations";

export interface UploadFileOptions {
  purpose: string;
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
  const presigned = await getPresignedUrlAction(
    file.name,
    file.type,
    file.size,
    options.purpose
  );

  await storageClient.uploadFile(file, presigned.upload_url, presigned.headers);

  const confirmed = await confirmUploadAction(
    presigned.file_id,
    presigned.key,
    file.type,
    file.size
  );

  return {
    fileId: confirmed.id,
    url: confirmed.url,
    originalName: confirmed.original_name || file.name,
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
