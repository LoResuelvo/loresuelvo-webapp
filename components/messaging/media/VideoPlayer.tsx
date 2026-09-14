import { useState, useRef } from "react";
import { Play } from "lucide-react";
import { formatVideoDuration } from "./VideoPreview";
import { t } from "@/infrastructure/i18n/translations";

export interface VideoPlayerProps {
  src: string;
  originalName?: string;
  durationSeconds: number;
  thumbnailUrl?: string;
  isOwnMessage?: boolean;
  className?: string;
}

export function VideoPlayer({
  src,
  durationSeconds,
  thumbnailUrl,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (!videoRef.current) return;
    void videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  return (
    <div data-testid="video-message-player" className={`relative rounded-xl overflow-hidden bg-black max-w-sm shadow-sm ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={thumbnailUrl}
        preload="metadata"
        playsInline
        controls={isPlaying}
        autoPlay={false}
        data-testid="video-thumbnail"
        className="w-full max-h-72 object-cover block"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      {!isPlaying && (
        <>
          <button
            type="button"
            onClick={handlePlay}
            aria-label={t.messaging.videoPreview.playLabel}
            data-testid="video-play-button"
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg z-10"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" aria-hidden="true" />
          </button>
          <div data-testid="video-duration" className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-mono font-medium pointer-events-none z-10">
            {formatVideoDuration(durationSeconds)}
          </div>
        </>
      )}
    </div>
  );
}
