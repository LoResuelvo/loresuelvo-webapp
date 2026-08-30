"use client";

import React, { ChangeEvent, RefObject } from "react";
import { Upload } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

export interface EvidenceDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  hidden?: boolean;
}

export function EvidenceDropzone({
  fileInputRef,
  onFileChange,
  disabled = false,
  hidden = false,
}: EvidenceDropzoneProps) {
  return (
    <>
      {!hidden && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-brand-primary cursor-pointer p-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs font-medium text-center">
            {t.workOrderCompletion.uploadButtonText}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        data-testid="completion-file-input"
        type="file"
        accept="image/*"
        multiple
        onChange={onFileChange}
        className="hidden"
        disabled={disabled}
      />
    </>
  );
}
