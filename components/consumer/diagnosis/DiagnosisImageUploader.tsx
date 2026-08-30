"use client";

import Image from "next/image";
import { X } from "lucide-react";

export interface DiagnosisImageUploaderProps {
  attachedFiles: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onPreviewImage: (preview: { url: string; name: string }) => void;
  disabled?: boolean;
}

export function DiagnosisImageUploader({
  attachedFiles,
  fileInputRef,
  onFileChange,
  onRemoveFile,
  onPreviewImage,
  disabled = false,
}: DiagnosisImageUploaderProps) {
  const canAttach = !disabled && attachedFiles.length < 5;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        multiple
        onChange={onFileChange}
        disabled={!canAttach}
      />
      {attachedFiles.length > 0 && (
        <div role="region" aria-label="Imágenes adjuntas" className="flex gap-2 overflow-x-auto pt-2 px-2 pb-1">
          {attachedFiles.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewImage({ url, name: file.name })}
                  className="w-16 h-16 rounded-md overflow-hidden border border-white/20 bg-white/10 relative cursor-pointer block hover:ring-2 hover:ring-white/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Image
                    src={url}
                    alt={`Vista previa de ${file.name}`}
                    fill
                    className="object-cover"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
