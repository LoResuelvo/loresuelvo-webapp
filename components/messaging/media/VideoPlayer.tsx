import { useState, useRef } from "react";
import { Play } from "lucide-react";
import { formatVideoDuration } from "./VideoPreview";
import { VideoViewerModal } from "./VideoViewerModal";
import { t } from "@/infrastructure/i18n/translations";

export interface VideoPlayerProps {
  src: string;
  originalName?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  isOwnMessage?: boolean;
  className?: string;
  onRefreshUrl?: () => Promise<string | null>;
}

export function VideoPlayer({
  src,
  originalName,
  durationSeconds,
  thumbnailUrl,
  className = "",
  onRefreshUrl,
}: VideoPlayerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <div
        data-testid="video-message-player"
        className={`relative rounded-xl overflow-hidden bg-black max-w-sm shadow-sm ${className}`}
      >
        <video
          src={src}
          poster={thumbnailUrl}
          preload="metadata"
          playsInline
          autoPlay={false}
          data-testid="video-thumbnail"
          className="w-full max-h-72 object-cover block"
        />
        <button
          ref={playButtonRef}
          type="button"
          onClick={() => setIsViewerOpen(true)}
          aria-label={t.messaging.videoPreview.playLabel}
          data-testid="video-play-button"
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg z-10"
        >
          <Play className="w-6 h-6 fill-current ml-0.5" aria-hidden="true" />
        </button>
        <div
          data-testid="video-duration"
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-mono font-medium pointer-events-none z-10"
        >
          {formatVideoDuration(durationSeconds)}
        </div>
      </div>

      <VideoViewerModal
        open={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        videoUrl={src}
        originalName={originalName}
        onRefreshUrl={onRefreshUrl}
        triggerRef={playButtonRef}
      />
    </>
  );
}
