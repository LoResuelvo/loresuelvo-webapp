import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface AudioPreviewProps {
  audioUrl: string;
  fileName: string;
  onRemove: () => void;
  onDurationLoaded?: (duration: number) => void;
}

export function formatAudioDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function AudioPreview({ audioUrl, fileName, onRemove, onDurationLoaded }: AudioPreviewProps) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <div
      data-testid="audio-preview"
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <audio
        controls
        preload="metadata"
        src={audioUrl}
        aria-label={`${t.messaging.audioPreview.playerLabel} ${fileName}`}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration)) {
            setDuration(nextDuration);
            onDurationLoaded?.(nextDuration);
          }
        }}
      />
      <span className="text-sm text-slate-600" data-testid="audio-duration">
        {t.messaging.audioPreview.durationLabel}{duration !== null ? ` ${formatAudioDuration(duration)}` : ""}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`${t.messaging.audioPreview.removeLabel} ${fileName}`}
        className="ml-auto text-slate-600 hover:text-slate-900"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
