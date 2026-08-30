import Image from "next/image";
import { X } from "lucide-react";

export interface AttachedFilesListProps {
  files: File[];
  onPreview: (file: File, url: string) => void;
  onRemove?: (index: number) => void;
}

export function AttachedFilesList({
  files,
  onPreview,
  onRemove,
}: AttachedFilesListProps) {
  if (files.length === 0) return null;

  return (
    <div className="p-4 pb-0 flex flex-wrap gap-2">
      {files.map((file, idx) => {
        const url = URL.createObjectURL(file);
        return (
          <div key={idx} className="relative group">
            <button
              type="button"
              onClick={() => onPreview(file, url)}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 block hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-label={`Ver vista previa de ${file.name}`}
            >
              <Image
                src={url}
                alt={file.name}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
                aria-label={`Eliminar ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
