"use client";

import { useRef } from "react";
import { Plus, Send } from "lucide-react";
import { AiChatImageAttachments } from "./AiChatImageAttachments";
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
    minRows: 1,
    maxRows: 6,
    lineHeight: 24,
  });

  const isAnyUploading = attachments.some((a) => a.status === "uploading");
  const hasFailed = attachments.some((a) => a.status === "failed");
  const canAttach = !disabled && attachments.length < 5;
  const canSend =
    !disabled && !isAnyUploading && !hasFailed && (Boolean(value.trim()) || attachments.length > 0);

  return (
    <div className={cn("flex flex-col border-t border-slate-200 bg-white flex-shrink-0 relative", className)}>
      <AiChatImageAttachments attachments={attachments} onRemove={onRemoveAttachment} onPreview={onPreviewImage} />
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 items-end">
        <div className="flex-1 min-w-0 flex items-end gap-2 bg-white border border-slate-200 rounded-3xl px-3 py-1 shadow-sm min-h-[44px]">
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
            className="h-9 w-9 text-slate-500 hover:text-brand-primary cursor-pointer flex-shrink-0"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
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
            aria-label={t.messaging.inputPlaceholder}
            rows={1}
            placeholder={t.messaging.inputPlaceholder}
            className="flex-1 min-w-0 min-h-9 resize-none border-none bg-transparent shadow-none px-1 py-1.5 text-sm leading-6 focus-visible:ring-0 text-slate-800 placeholder:text-slate-400"
            disabled={disabled}
          />
        </div>
        <Button
          variant="brand"
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label={t.messaging.sendLabel}
          className="h-11 w-11 rounded-full p-0 flex items-center justify-center font-semibold shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Send className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>
      {uploadError && (
        <div role="alert" className="px-4 pb-2 text-red-500 text-sm font-medium">
          {uploadError}
        </div>
      )}
    </div>
  );
}
