"use client";

import { DiagnosisImageAttachmentItem } from "./DiagnosisImageAttachmentItem";
import type { InitialDiagnosisAttachment } from "./attachments/initial-diagnosis-attachment";

export interface DiagnosisImageUploaderProps {
  attachments: InitialDiagnosisAttachment[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onPreviewImage: (preview: { url: string; name: string }) => void;
  disabled?: boolean;
}

export function DiagnosisImageUploader({
  attachments,
  fileInputRef,
  onFileChange,
  onRemoveAttachment,
  onPreviewImage,
  disabled = false,
}: DiagnosisImageUploaderProps) {
  const canAttach = !disabled && attachments.length < 5;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp, image/jpg"
        multiple
        onChange={onFileChange}
        disabled={!canAttach}
      />
      {attachments.length > 0 && (
        <div role="region" aria-label="Imágenes adjuntas" className="flex gap-2 overflow-x-auto pt-2 px-2 pb-1">
          {attachments.map((attachment) => (
            <DiagnosisImageAttachmentItem
              key={attachment.id}
              attachment={attachment}
              disabled={disabled}
              onPreview={(att) => onPreviewImage({ url: att.previewUrl, name: att.file.name })}
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}
    </>
  );
}
