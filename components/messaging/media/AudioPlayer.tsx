import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

interface AudioPlayerProps {
  src: string;
  originalName?: string;
  durationSeconds?: number;
  isOwnMessage?: boolean;
  className?: string;
  onDurationLoaded?: (duration: number) => void;
}

const WAVEFORM_BAR_HEIGHTS = [
  32, 55, 78, 45, 65, 90, 50, 75, 100, 85, 60, 40, 70, 88, 95, 75, 45, 65, 82, 92, 68, 48, 78, 55, 35,
];

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const safeSeconds = Math.round(seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export { formatAudioTime as formatAudioDuration };

export function AudioPlayer({
  src,
  originalName = "audio.webm",
  durationSeconds,
  isOwnMessage = false,
  className = "",
  onDurationLoaded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(durationSeconds ?? 0);

  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      if (Number.isFinite(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
        onDurationLoaded?.(audioDuration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (nextTime: number) => {
    const safeTime = Math.max(0, Math.min(duration || 0, nextTime));
    setCurrentTime(safeTime);
    if (audioRef.current) {
      audioRef.current.currentTime = safeTime;
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || duration <= 0) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeek(ratio * duration);
  };

  const currentDuration = duration > 0 ? duration : 0;
  const progressRatio = currentDuration > 0 ? Math.min(1, Math.max(0, currentTime / currentDuration)) : 0;
  const displayTime = isPlaying || currentTime > 0 ? formatAudioTime(currentTime) : formatAudioTime(currentDuration);

  return (
    <div
      data-testid="custom-audio-player"
      className={`flex items-center gap-2.5 py-1 px-1 rounded-2xl transition-all w-full max-w-sm ${
        isOwnMessage ? "text-white" : "text-slate-800"
      } ${className}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        aria-label={`${t.messaging.audioPreview.playerLabel} ${originalName}`}
      />

      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlayPause}
        aria-label={
          isPlaying
            ? `${t.messaging.audioPlayer.pauseLabel} ${originalName}`
            : `${t.messaging.audioPlayer.playLabel} ${originalName}`
        }
        className={`h-9 w-9 p-0 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 ${
          isOwnMessage
            ? "bg-transparent text-white hover:bg-white/20 active:bg-white/30 focus-visible:ring-white/50"
            : "bg-transparent text-emerald-600 hover:bg-emerald-100 active:bg-emerald-100 focus-visible:ring-emerald-500/50"
        }`}
      >
        {isPlaying ? (
          <Pause
            className={`h-5 w-5 ${
              isOwnMessage ? "text-white fill-white" : "text-emerald-600 fill-emerald-600"
            }`}
            aria-hidden="true"
          />
        ) : (
          <Play
            className={`h-5 w-5 ${
              isOwnMessage ? "text-white fill-white" : "text-emerald-600 fill-emerald-600"
            }`}
            aria-hidden="true"
          />
        )}
      </button>

      {/* WhatsApp-style Waveform bars */}
      <div
        ref={waveformRef}
        onClick={handleWaveformClick}
        role="presentation"
        className="flex-1 flex items-center gap-[2.5px] h-7 cursor-pointer px-1 group select-none"
      >
        {WAVEFORM_BAR_HEIGHTS.map((heightPercent, idx) => {
          const barRatio = (idx + 1) / WAVEFORM_BAR_HEIGHTS.length;
          const isBarPlayed = progressRatio >= barRatio - 0.02;

          return (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full pointer-events-none"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full min-w-[2px] max-w-[3.5px] rounded-full transition-colors duration-150 ${
                  isBarPlayed
                    ? isOwnMessage
                      ? "bg-white"
                      : "bg-emerald-600"
                    : isOwnMessage
                    ? "bg-white/35 group-hover:bg-white/50"
                    : "bg-slate-300 group-hover:bg-slate-400"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Hidden range input for accessibility / keyboard controls */}
      <input
        type="range"
        min={0}
        max={currentDuration || 100}
        step={0.1}
        value={currentTime}
        onChange={(e) => handleSeek(Number(e.target.value))}
        aria-label={t.messaging.audioPlayer.seekLabel}
        className="sr-only"
      />

      {/* Duration Timestamp */}
      <span
        className={`text-[12px] font-mono font-medium shrink-0 min-w-[32px] text-right ${
          isOwnMessage ? "text-white/80" : "text-slate-500"
        }`}
      >
        {displayTime}
      </span>
    </div>
  );
}
