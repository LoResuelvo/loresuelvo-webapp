import { Mic, Pause, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAudioDuration } from "@/components/messaging/media/AudioPreview";
import { t } from "@/infrastructure/i18n/translations";

const WAVEFORM_BARS = [40, 75, 95, 60, 80, 100, 50, 85, 65, 45, 75, 90, 60, 40, 80];

export interface AudioRecordingControlsProps {
  isPaused: boolean;
  elapsedSeconds: number;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function AudioRecordingControls({
  isPaused,
  elapsedSeconds,
  onCancel,
  onPause,
  onResume,
  onStop,
}: AudioRecordingControlsProps) {
  return (
    <div
      data-testid="audio-recording"
      role="status"
      className="flex-1 flex items-center justify-between gap-3 px-4 h-[44px] rounded-full border border-slate-200 bg-white shadow-sm animate-in fade-in duration-200"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
        aria-label={t.messaging.audioRecorder.cancelLabel}
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0 transition-colors"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>

      <div className="flex-1 flex items-center gap-2 px-2">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
            isPaused ? "bg-amber-500" : "bg-red-500 animate-pulse"
          }`}
        />
        <div className="flex-1 flex items-center gap-[3px] h-3.5">
          {WAVEFORM_BARS.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`w-[2.5px] rounded-full transition-all ${
                isPaused ? "bg-slate-300" : "bg-red-400 animate-pulse"
              }`}
            />
          ))}
        </div>
      </div>

      <span className="font-mono text-xs font-semibold text-slate-600 shrink-0">
        {formatAudioDuration(elapsedSeconds)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={isPaused ? onResume : onPause}
        aria-label={
          isPaused
            ? t.messaging.audioRecorder.resumeLabel
            : t.messaging.audioRecorder.pauseLabel
        }
        className="h-8 w-8 text-slate-600 hover:text-slate-900 rounded-full shrink-0 transition-colors cursor-pointer"
      >
        {isPaused ? (
          <Mic className="h-4 w-4 text-red-500" aria-hidden="true" />
        ) : (
          <Pause className="h-4 w-4 text-slate-600" aria-hidden="true" />
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onStop}
        aria-label={t.messaging.audioRecorder.stopLabel}
        className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full shrink-0 transition-colors cursor-pointer"
      >
        <Square className="h-4 w-4 fill-current" aria-hidden="true" />
      </Button>
    </div>
  );
}
