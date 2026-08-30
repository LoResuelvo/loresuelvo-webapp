"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

export interface ThumbnailGridProps {
  files: File[];
  onPreview: (file: File) => void;
  onRemove: (index: number) => void;
}

export function ThumbnailGrid({ files, onPreview, onRemove }: ThumbnailGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2.5 flex-wrap py-1">
      {files.map((file, idx) => {
        const url = URL.createObjectURL(file);
        return (
          <div key={`${file.name}-${idx}`} className="relative">
            <button
              type="button"
              onClick={() => onPreview(file)}
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
              onClick={() => onRemove(idx)}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
              aria-label={`Eliminar ${file.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
