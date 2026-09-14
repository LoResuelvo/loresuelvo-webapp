import { useState, useRef } from "react";
import { Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const safeSeconds = Math.round(seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface VideoThumbnailProps {
  videoUrl: string;
  onDurationLoaded: (duration: number) => void;
}

function VideoThumbnail({ videoUrl, onDurationLoaded }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    if (Number.isFinite(dur) && dur > 0) {
      onDurationLoaded(dur);
    }
  };

  return (
    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 flex items-center justify-center group">
      <video
        ref={videoRef}
        src={videoUrl}
        preload="metadata"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        className="w-full h-full object-cover"
        data-testid="video-preview-player"
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? t.messaging.videoPreview.pauseLabel : t.messaging.videoPreview.playLabel}
        className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>
    </div>
  );
}

export interface VideoPreviewProps {
  videoUrl: string;
  fileName: string;
  durationSeconds?: number;
  onRemove: () => void;
  onDurationLoaded?: (duration: number) => void;
  className?: string;
}

export function VideoPreview({
  videoUrl,
  fileName,
  durationSeconds,
  onRemove,
  onDurationLoaded,
  className = "",
}: VideoPreviewProps) {
  const [duration, setDuration] = useState<number>(durationSeconds ?? 0);

  const handleDurationLoaded = (dur: number) => {
    setDuration(dur);
    onDurationLoaded?.(dur);
  };

  const effectiveDuration = durationSeconds && durationSeconds > 0 ? durationSeconds : duration;

  return (
    <div
      data-testid="video-preview"
      className={`flex items-center gap-3 p-2 bg-slate-100/90 rounded-2xl border border-slate-200 ${className}`}
    >
      <VideoThumbnail videoUrl={videoUrl} onDurationLoaded={handleDurationLoaded} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate" title={fileName}>
          {fileName}
        </p>
        <p className="text-xs text-slate-500 font-mono">
          {formatVideoDuration(effectiveDuration)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={t.messaging.videoPreview.removeLabel}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
