import Image from "next/image";
import { Loader2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InitialDiagnosisAttachment } from "./attachments/initial-diagnosis-attachment";

export interface DiagnosisImageAttachmentItemProps {
  attachment: InitialDiagnosisAttachment;
  disabled?: boolean;
  onPreview: (attachment: InitialDiagnosisAttachment) => void;
  onRemove: (id: string) => void;
}

export function DiagnosisImageAttachmentItem({
  attachment,
  disabled = false,
  onPreview,
  onRemove,
}: DiagnosisImageAttachmentItemProps) {
  const isUploading = attachment.status === "uploading";
  const isFailed = attachment.status === "failed";

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => onPreview(attachment)}
        disabled={disabled}
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
        onClick={() => onRemove(attachment.id)}
        disabled={disabled}
        className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 disabled:opacity-50"
        aria-label={`Eliminar ${attachment.file.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
