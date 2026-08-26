import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { AudioPlayer, formatAudioDuration } from "./AudioPlayer";

export { formatAudioDuration };

interface AudioPreviewProps {
  audioUrl: string;
  fileName: string;
  onRemove: () => void;
  onDurationLoaded?: (duration: number) => void;
}

export function AudioPreview({ audioUrl, fileName, onRemove, onDurationLoaded }: AudioPreviewProps) {
  return (
    <div
      data-testid="audio-preview"
      className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/90 py-1 px-3 flex-1 min-w-0"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`${t.messaging.audioPreview.removeLabel} ${fileName}`}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0 transition-colors cursor-pointer"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>

      <AudioPlayer
        src={audioUrl}
        originalName={fileName}
        onDurationLoaded={onDurationLoaded}
        className="flex-1"
      />
    </div>
  );
}
