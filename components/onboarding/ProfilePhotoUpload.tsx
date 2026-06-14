import { useState, useRef, ChangeEvent } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";

interface ProfilePhotoUploadProps {
  onPhotoSelected: (file: File | null) => void;
  error?: string | null;
}

export function ProfilePhotoUpload({ onPhotoSelected, error }: ProfilePhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onPhotoSelected(file);
    } else {
      setPreviewUrl(null);
      onPhotoSelected(null);
    }
  };

  const handleContainerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-3 mb-6">
      <div 
        className={`relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors hover:border-brand-primary hover:bg-brand-neutral/20 ${
          error ? "border-destructive bg-destructive/5" : "border-muted-foreground/30 bg-brand-neutral/10"
        }`}
        onClick={handleContainerClick}
        role="button"
        tabIndex={0}
        aria-label="Seleccionar foto de perfil"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleContainerClick();
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
            <span className="text-[10px] font-medium uppercase tracking-wider">Subir</span>
          </div>
        )}
        
        {previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <ImageIcon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      <input
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
