"use client";

import { RefObject } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

export interface ImageDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  maxFilesReached?: boolean;
}

export function ImageDropzone({
  fileInputRef,
  onFileChange,
  disabled = false,
  maxFilesReached = false,
}: ImageDropzoneProps) {
  const isActionDisabled = disabled || maxFilesReached;

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        multiple
        onChange={onFileChange}
        disabled={isActionDisabled}
      />
      <Button
        type="button"
        variant="brandSecondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isActionDisabled}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
      >
        <Paperclip className="w-4 h-4" />
        {t.consumerSearch.form.attachImages}
      </Button>
    </div>
  );
}
