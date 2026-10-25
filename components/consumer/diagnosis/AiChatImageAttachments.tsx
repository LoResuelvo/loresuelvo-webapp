"use client";

import Image from "next/image";
import { AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/infrastructure/i18n/translations";
import type { AiImageAttachment } from "./attachments/ai-image-attachment";

interface AiChatImageAttachmentsProps {
  attachments: AiImageAttachment[];
  onRemove: (id: string) => void;
  onPreview: (image: { url: string; name: string }) => void;
}

export function AiChatImageAttachments({ attachments, onRemove, onPreview }: AiChatImageAttachmentsProps) {
  return (
    <>
      {attachments.length > 0 && (
        <div role="region" aria-label={t.aiDiagnosis.attachedImages} className="flex gap-2 overflow-x-auto p-4 pb-0">
          {attachments.map((attachment) => {
            const isUploading = attachment.status === "uploading";
            const isFailed = attachment.status === "failed";

            return (
              <div key={attachment.id} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onPreview({ url: attachment.previewUrl, name: attachment.file.name })}
                  className={cn(
                    "w-16 h-16 rounded-xl overflow-hidden border bg-slate-50 relative cursor-pointer block transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                    isFailed
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-slate-200 hover:ring-2 hover:ring-brand-primary/40"
                  )}
                >
                  <Image
                    src={attachment.previewUrl}
                    alt={t.aiDiagnosis.imagePreview(attachment.file.name)}
                    fill
                    className={cn("object-cover", isUploading && "opacity-60")}
                    unoptimized
                  />
                  {isUploading && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/30"
                      aria-label={t.aiDiagnosis.uploadingImage}
                    >
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {isFailed && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-red-950/40"
                      aria-label={t.aiDiagnosis.imageUploadFailed}
                    >
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(attachment.id)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                  aria-label={t.aiDiagnosis.removeImage(attachment.file.name)}
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
