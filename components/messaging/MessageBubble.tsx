import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import Image from "next/image";
import { useState } from "react";
import { ImagePreviewModal } from "./ImagePreviewModal";

interface MessageBubbleProps {
  id: string;
  content?: string;
  sentAt: string;
  isExpanded: boolean;
  showExpandButton: boolean;
  onToggleExpand: (id: string) => void;
  isOwnMessage?: boolean;
  images?: { id: string; url: string; originalName: string }[];
  audio?: { id: string; url: string; originalName: string; durationSeconds: number };
}

export default function MessageBubble({
  id,
  content,
  sentAt,
  isExpanded,
  showExpandButton,
  onToggleExpand,
  isOwnMessage = true,
  images,
  audio,
}: MessageBubbleProps) {
  const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        data-testid={`message-bubble-${id}`}
        className={`rounded-2xl p-4 max-w-md ${
          isOwnMessage
            ? "bg-brand-primary text-white rounded-tr-sm"
            : "bg-white text-brand-primary border border-slate-200 rounded-tl-sm"
        }`}
      >
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setPreviewImage({ url: img.url, name: img.originalName })}
                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden border border-white/20 bg-slate-100 cursor-pointer block hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Image
                  src={img.url}
                  alt={`${t.messaging.attachedImage} ${img.originalName}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
        {audio && (
          <div className="flex flex-col gap-1 mb-2" data-testid={`audio-message-${id}`}>
            <audio
              controls
              preload="metadata"
              src={audio.url}
              aria-label={`Reproductor de audio ${audio.originalName}`}
            />
            <span data-testid="audio-duration" className="text-caption">
              {t.messaging.audioPreview.durationLabel} {Math.floor(audio.durationSeconds / 60)}:{String(audio.durationSeconds % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        {content && (
          <p className={`text-body whitespace-pre-wrap break-words ${!isExpanded && showExpandButton ? "line-clamp-5" : ""}`}>
            {content}
          </p>
        )}
        {showExpandButton && (
          <Button
            variant="ghost"
            onClick={() => onToggleExpand(id)}
            className={`text-caption mt-1 hover:underline p-0 h-auto hover:bg-transparent ${
              isOwnMessage ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {isExpanded ? t.messaging.expandLess : t.messaging.expandMore}
          </Button>
        )}
        <p className={`text-caption mt-2 ${isOwnMessage ? "text-white/70" : "text-slate-400"}`}>{sentAt}</p>
      </div>
      
      <ImagePreviewModal
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url ?? ""}
        altText={previewImage ? `${t.messaging.attachedImage} ${previewImage.name}` : ""}
      />
    </div>
  );
}
