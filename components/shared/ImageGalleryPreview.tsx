"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageImage } from "@/domain/messaging/types";
import { ImagePreviewModal } from "@/components/messaging/ImagePreviewModal";
import { t } from "@/infrastructure/i18n/translations";

interface ImageGalleryPreviewProps {
  images?: MessageImage[];
  label: string;
}

export function ImageGalleryPreview({ images, label }: ImageGalleryPreviewProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="pt-4 border-t border-slate-100 space-y-2">
      <span className="text-base font-semibold text-slate-700 uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-2 flex gap-3 flex-wrap">
        {images.map((img) => (
<button
              key={img.id}
              type="button"
              onClick={() => setPreviewImage({ url: img.url, name: img.originalName })}
              className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative cursor-pointer hover:ring-2 hover:ring-brand-primary/50 transition-all"
            >
            <Image
              src={img.url}
              alt={img.originalName}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `${t.messaging.previewTitle} ${previewImage.name}` : ""}
      />
    </div>
  );
}
