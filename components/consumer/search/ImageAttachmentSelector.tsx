"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePreviewModal } from "@/components/messaging/ImagePreviewModal";
import { t } from "@/infrastructure/i18n/translations";

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
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {t.consumerSearch.form.attachImages}
      </span>

      {files.length > 0 && (
        <div className="flex gap-2.5 flex-wrap py-1">
          {files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${idx}`} className="relative">
                <button
                  type="button"
                  onClick={() => setPreviewImage({ url, name: file.name })}
                  className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative cursor-pointer block hover:ring-2 hover:ring-brand-primary/50 transition-all"
                >
                  <Image
                    src={url}
                    alt={`${t.messaging.previewTitle} ${file.name}`}
                    fill
                    className="object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg, image/png, image/webp"
          multiple
          onChange={handleFileChange}
          disabled={disabled || files.length >= maxFiles}
        />
        <Button
          type="button"
          variant="brandSecondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || files.length >= maxFiles}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
        >
          <Paperclip className="w-4 h-4" />
          {t.consumerSearch.form.attachImages}
        </Button>
      </div>
      <span className="text-[11px] text-slate-400">
        {t.consumerSearch.form.imageLimit}
      </span>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `${t.messaging.previewTitle} ${previewImage.name}` : ""}
      />
    </div>
  );
}
