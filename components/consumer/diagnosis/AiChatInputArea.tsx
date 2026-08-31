"use client";

import { useRef } from "react";
import Image from "next/image";
import { Paperclip, Send, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/infrastructure/i18n/translations";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { cn } from "@/lib/utils";
import type { AiImageAttachment } from "./attachments/ai-image-attachment";

export interface AiChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export interface AiChatFilesProps {
  attachments: AiImageAttachment[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
  onPreview: (image: { url: string; name: string }) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export interface AiChatInputAreaProps {
  composer: AiChatComposerProps;
  files: AiChatFilesProps;
  disabled?: boolean;
  uploadError?: string | null;
  className?: string;
}

export function AiChatInputArea({
  composer,
  files,
  disabled = false,
  uploadError = null,
  className,
}: AiChatInputAreaProps) {
  const { value, onChange, onSend } = composer;
  const {
    attachments,
    onFileChange,
    onRemove: onRemoveAttachment,
    onPreview: onPreviewImage,
    fileInputRef: externalFileInputRef,
  } = files;

  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef ?? internalFileInputRef;

  const { ref: textareaRef } = useAutoResizeTextarea(value, {
    minRows: 2,
    maxRows: 6,
    lineHeight: 24,
  });

  const isAnyUploading = attachments.some((a) => a.status === "uploading");
  const hasFailed = attachments.some((a) => a.status === "failed");
  const canAttach = !disabled && attachments.length < 5;
  const canSend =
    !disabled && !isAnyUploading && !hasFailed && (Boolean(value.trim()) || attachments.length > 0);

  return (
    <div className={cn("flex flex-col border-t border-slate-200 bg-white flex-shrink-0", className)}>
      {attachments.length > 0 && (
        <div role="region" aria-label={t.aiDiagnosis.attachedImages} className="flex gap-2 overflow-x-auto p-4 pb-0">
          {attachments.map((attachment) => {
            const isUploading = attachment.status === "uploading";
            const isFailed = attachment.status === "failed";

            return (
              <div key={attachment.id} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewImage({ url: attachment.previewUrl, name: attachment.file.name })}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden border bg-slate-50 relative cursor-pointer block transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                    isFailed
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-slate-200 hover:ring-2 hover:ring-brand-primary/40"
                  )}
                >
                  <Image
                    src={attachment.previewUrl}
                    alt={`Vista previa de ${attachment.file.name}`}
                    fill
                    className={cn("object-cover", isUploading && "opacity-60")}
                    unoptimized
                  />
                  {isUploading && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/30"
                      aria-label="Cargando imagen"
                    >
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {isFailed && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-red-950/40"
                      aria-label="Error al cargar imagen"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  aria-label={`Eliminar ${attachment.file.name}`}
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
              if (canSend) {
                onSend();
              }
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
