"use client";

import { useRef } from "react";
import Image from "next/image";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { cn } from "@/lib/utils";

export interface AiChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  attachedFiles: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onPreviewImage: (image: { url: string; name: string }) => void;
  disabled?: boolean;
  uploadError?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export function AiChatInputArea({
  value,
  onChange,
  onSend,
  attachedFiles,
  onFileChange,
  onRemoveFile,
  onPreviewImage,
  disabled = false,
  uploadError = null,
  fileInputRef: externalFileInputRef,
  className,
}: AiChatInputAreaProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef ?? internalFileInputRef;

  const { ref: textareaRef } = useAutoResizeTextarea(value, {
    minRows: 2,
    maxRows: 6,
    lineHeight: 24,
  });

  const canAttach = !disabled && attachedFiles.length < 5;
  const canSend = !disabled && (Boolean(value.trim()) || attachedFiles.length > 0);

  return (
    <div className={cn("flex flex-col border-t border-slate-200 bg-white flex-shrink-0", className)}>
      {attachedFiles.length > 0 && (
        <div role="region" aria-label={t.aiDiagnosis.attachedImages} className="flex gap-2 overflow-x-auto p-4 pb-0">
          {attachedFiles.map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewImage({ url, name: file.name })}
                  className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative cursor-pointer block hover:ring-2 hover:ring-brand-primary/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                >
                  <Image
                    src={url}
                    alt={`Vista previa de ${file.name}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFile(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="p-4 flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg, image/png, image/webp"
          multiple
          onChange={onFileChange}
          disabled={!canAttach}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAttach}
          aria-label={t.aiDiagnosis.attachImages}
          className="text-slate-500 hover:text-brand-primary hover:bg-slate-100 flex-shrink-0"
        >
          <Paperclip className="w-5 h-5" aria-hidden="true" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={t.messaging.inputPlaceholder}
          className="flex-1 resize-none px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 bg-white text-body leading-6 focus-visible:ring-brand-secondary/40"
          disabled={disabled}
        />
        <Button
          variant="brand"
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label={t.messaging.sendLabel}
          className="h-[48px] px-5 rounded-xl font-semibold"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
      {uploadError && (
        <div className="px-4 pb-2 text-red-500 text-sm font-medium">
          {uploadError}
        </div>
      )}
    </div>
  );
}
