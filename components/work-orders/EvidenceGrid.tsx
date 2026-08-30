"use client";

import React, { ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { SelectedImage } from "./useReportCompletionForm";

export interface EvidenceGridProps {
  images: SelectedImage[];
  onRemove: (id: string) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function EvidenceGrid({
  images,
  onRemove,
  disabled = false,
  children,
}: EvidenceGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((img, index) => (
        <div
          key={img.id}
          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.previewUrl}
            alt={`Vista previa de ${img.file.name}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(img.id)}
            disabled={disabled}
            aria-label={`${t.workOrderCompletion.removeImageText} ${img.file.name}`}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-600 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-caption font-medium">
            #{index + 1}
          </span>
        </div>
      ))}
      {children}
    </div>
  );
}
