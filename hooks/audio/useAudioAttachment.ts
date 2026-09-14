import { useState, useRef, useEffect, useCallback, type ChangeEvent, type RefObject } from "react";
import { validateAudioFile, validateAudioDuration } from "@/lib/audio/audio-validation";
import { t } from "@/infrastructure/i18n/translations";

export interface AttachedAudio {
  file: File;
  url: string;
}

export interface UseAudioAttachmentOptions {
  disabled?: boolean;
  onBeforeAttach?: () => boolean;
  onAudioAttached?: (audio: AttachedAudio) => void;
  onError?: (message: string) => void;
  onClearError?: () => void;
}

export interface UseAudioAttachmentResult {
  attachedAudio: AttachedAudio | null;
  audioInputRef: RefObject<HTMLInputElement | null>;
  handleAudioChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAudioDurationLoaded: (duration: number) => void;
  removeAudio: () => void;
  clearAudio: () => void;
}

function createAudioAttachment(file: File): { audio?: AttachedAudio; errorKey?: string } {
  const error = validateAudioFile(file);
  if (error) return { errorKey: error };
  return { audio: { file, url: URL.createObjectURL(file) } };
}

export function useAudioAttachment({
  disabled = false,
  onBeforeAttach,
  onAudioAttached,
  onError,
  onClearError,
}: UseAudioAttachmentOptions = {}): UseAudioAttachmentResult {
  const [attachedAudio, setAttachedAudio] = useState<AttachedAudio | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (attachedAudio) URL.revokeObjectURL(attachedAudio.url);
  }, [attachedAudio]);

  const removeAudio = useCallback(() => setAttachedAudio(null), []);

  const handleAudioChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (onBeforeAttach && !onBeforeAttach()) {
        e.target.value = "";
        return;
      }
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const { audio, errorKey } = createAudioAttachment(file);
      if (errorKey) return onError?.(t.messaging.audioAttachment[errorKey as keyof typeof t.messaging.audioAttachment]);
      if (audio) {
        setAttachedAudio(audio);
        onAudioAttached?.(audio);
        onClearError?.();
      }
    },
    [disabled, onBeforeAttach, onAudioAttached, onError, onClearError]
  );

  const handleAudioDurationLoaded = useCallback(
    (duration: number) => {
      if (validateAudioDuration(duration)) {
        onError?.(t.messaging.audioAttachment.durationTooLong);
        setAttachedAudio(null);
        return;
      }
      onClearError?.();
    },
    [onError, onClearError]
  );

  return {
    attachedAudio,
    audioInputRef,
    handleAudioChange,
    handleAudioDurationLoaded,
    removeAudio,
    clearAudio: removeAudio,
  };
}
