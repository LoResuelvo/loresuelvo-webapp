"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AvatarUploaderProps {
  onPhotoSelected: (file: File | null) => void;
  error?: string | null;
  className?: string;
}

function createPreviewUrl(file: File | null): string | null {
  if (!file) return null;
  const isAllowedType = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type);
  const isAllowedSize = file.size <= 5 * 1024 * 1024;
  if (isAllowedType && isAllowedSize && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(file);
  }
  return null;
}

interface AvatarDropzoneProps {
  previewUrl: string | null;
  error?: string | null;
  onClick: () => void;
}

function AvatarDropzone({ previewUrl, error, onClick }: AvatarDropzoneProps) {
  return (
    <div
      className={`relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors hover:border-brand-primary hover:bg-brand-neutral/20 ${
        error ? "border-destructive bg-destructive/5" : "border-muted-foreground/30 bg-brand-neutral/10"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Seleccionar foto de perfil"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {previewUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt="Vista previa"
          className="h-full w-full object-cover"
          data-testid="profile-photo-preview"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="mb-1 h-6 w-6" />
          <span className="text-caption font-medium uppercase tracking-wider">Subir</span>
        </div>
      )}

      {previewUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
          <ImageIcon className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  );
}

export function AvatarUploader({ onPhotoSelected, error, className }: AvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (previewUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreviewUrl = createPreviewUrl(file);
    setPreviewUrl(nextPreviewUrl);
    onPhotoSelected(file);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-3 mb-6", className)}>
      <AvatarDropzone
        previewUrl={previewUrl}
        error={error}
        onClick={() => fileInputRef.current?.click()}
      />

      <Input
        type="file"
        name="profilePhoto"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Alias for backwards compatibility
export { AvatarUploader as ProfilePhotoUpload };
