import { useState, useRef } from "react";
import { ClientFileRepository } from "@/infrastructure/repositories/shared/client-repositories";
import { t } from "@/infrastructure/i18n/translations";

const fileRepository = new ClientFileRepository();

export interface UseAiFileManagerProps {
  onUploadError?: (error: string) => void;
}

export function useAiFileManager(props?: UseAiFileManagerProps) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedImagesMapRef = useRef<{ fileName: string; fileId: string }[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(t.messaging.fileTooLarge);
          return false;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          setUploadError(t.messaging.photoInvalidFormat);
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        setUploadError(null);
        setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5));

        for (const file of validFiles) {
          try {
            const presigned = await fileRepository.getPresignedUrl(
              file.name,
              file.type,
              file.size,
              "conversation_message_image"
            );
            await fileRepository.uploadFile(presigned.upload_url, file, presigned.headers);
            const confirm = await fileRepository.confirmUpload(
              presigned.file_id,
              presigned.key,
              file.type,
              file.size
            );
            uploadedImagesMapRef.current.push({
              fileName: file.name,
              fileId: confirm.id,
            });
          } catch (uploadErr) {
            console.error("Error al subir archivo inmediatamente:", uploadErr);
            props?.onUploadError?.(t.aiDiagnosis.errors.imageUpload);
          }
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachedFiles((prev) => {
      const newFiles = prev.filter((_, idx) => idx !== indexToRemove);
      const removedFile = prev[indexToRemove];
      if (removedFile) {
        uploadedImagesMapRef.current = uploadedImagesMapRef.current.filter(
          (m) => m.fileName !== removedFile.name
        );
      }
      return newFiles;
    });
  };

  const getUploadedImageIds = () => {
    return uploadedImagesMapRef.current.map((m) => m.fileId);
  };

  const clearFiles = () => {
    setAttachedFiles([]);
    uploadedImagesMapRef.current = [];
  };

  return {
    attachedFiles,
    setAttachedFiles,
    previewImage,
    setPreviewImage,
    uploadError,
    setUploadError,
    fileInputRef,
    handleFileChange,
    handleRemoveFile,
    getUploadedImageIds,
    clearFiles,
  };
}
