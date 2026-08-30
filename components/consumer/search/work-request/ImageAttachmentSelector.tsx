"use client";

import { useRef, useState } from "react";
import { ImagePreviewModal } from "@/components/messaging/media/ImagePreviewModal";
import { t } from "@/infrastructure/i18n/translations";
import { ThumbnailGrid } from "./ThumbnailGrid";
import { ImageDropzone } from "./ImageDropzone";

interface ImageAttachmentSelectorProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  onError: (error: string | null) => void;
}

export function ImageAttachmentSelector({
  files,
  onChange,
  maxFiles = 3,
  disabled = false,
  onError,
}: ImageAttachmentSelectorProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      if (files.length + filesArray.length > maxFiles) {
        onError(t.consumerSearch.form.imageLimitReached);
        return;
      }

      const validFiles = filesArray.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          onError(t.messaging.fileTooLarge);
          return false;
        }
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          onError(t.messaging.photoInvalidFormat);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        onError(null);
        onChange([...files, ...validFiles]);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    onChange(files.filter((_, idx) => idx !== index));
    onError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-bold text-slate-400 uppercase tracking-wider">
        {t.consumerSearch.form.attachImages}
      </span>

      <ThumbnailGrid
        files={files}
        onPreview={(file) => setPreviewImage({ url: URL.createObjectURL(file), name: file.name })}
        onRemove={handleRemoveFile}
      />

      <ImageDropzone
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        disabled={disabled}
        maxFilesReached={files.length >= maxFiles}
      />

      <span className="text-caption text-slate-400">
        {t.consumerSearch.form.imageLimit}
      </span>

      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `${t.messaging.previewTitle} ${previewImage.name}` : ""}
      />
    </div>
  );
}
