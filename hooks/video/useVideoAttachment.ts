import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import {
  validateVideoFile,
  validateVideoMetadata,
  readVideoMetadata,
  type VideoMetadata,
  type VideoValidationError,
} from "@/lib/video/video-validation";

export type VideoAttachmentState = "idle" | "preparing" | "ready" | "invalid";

export interface AttachedVideo {
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
}

export interface UseVideoAttachmentOptions {
  onVideoSelected?: (video: AttachedVideo) => void;
  onVideoRemoved?: () => void;
  onError?: (error: VideoValidationError) => void;
  onBeforeSelect?: () => boolean;
}

export interface UseVideoAttachmentResult {
  state: VideoAttachmentState;
  attachedVideo: AttachedVideo | null;
  error: VideoValidationError | null;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  handleVideoChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  attachVideoFile: (file: File) => Promise<boolean>;
  removeVideo: () => void;
  clearError: () => void;
}

export type VideoProcessOutcome =
  | { ok: true; attachedVideo: AttachedVideo }
  | { ok: false; error: VideoValidationError };

export async function processVideoFile(file: File): Promise<VideoProcessOutcome> {
  const fileError = validateVideoFile(file);
  if (fileError) {
    return { ok: false, error: fileError };
  }

  try {
    const meta: VideoMetadata = await readVideoMetadata(file);
    const metaError = validateVideoMetadata(meta);
    if (metaError) {
      return { ok: false, error: metaError };
    }

    const url = URL.createObjectURL(file);
    return {
      ok: true,
      attachedVideo: {
        file,
        url,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
      },
    };
  } catch {
    return {
      ok: false,
      error: "corruptedOrUnreadable",
    };
  }
}

function useVideoState({
  onError,
  onVideoSelected,
  onVideoRemoved,
}: {
  onError?: (error: VideoValidationError) => void;
  onVideoSelected?: (video: AttachedVideo) => void;
  onVideoRemoved?: () => void;
}) {
  const [state, setState] = useState<VideoAttachmentState>("idle");
  const [attachedVideo, setAttachedVideo] = useState<AttachedVideo | null>(null);
  const [error, setError] = useState<VideoValidationError | null>(null);
  const attachedVideoRef = useRef(attachedVideo);
  attachedVideoRef.current = attachedVideo;

  useEffect(() => () => {
    if (attachedVideoRef.current) URL.revokeObjectURL(attachedVideoRef.current.url);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const removeVideo = useCallback(() => {
    setAttachedVideo((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setState("idle");
    setError(null);
    onVideoRemoved?.();
  }, [onVideoRemoved]);

  const applyOutcome = useCallback(
    (outcome: VideoProcessOutcome) => {
      if (!outcome.ok) {
        setState("invalid");
        setError(outcome.error);
        onError?.(outcome.error);
        return false;
      }
      setAttachedVideo((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return outcome.attachedVideo;
      });
      setState("ready");
      setError(null);
      onVideoSelected?.(outcome.attachedVideo);
      return true;
    },
    [onError, onVideoSelected]
  );

  return { state, setState, attachedVideo, error, setError, clearError, removeVideo, applyOutcome };
}

export function useVideoAttachment({
  onVideoSelected,
  onVideoRemoved,
  onError,
  onBeforeSelect,
}: UseVideoAttachmentOptions = {}): UseVideoAttachmentResult {
  const { state, setState, attachedVideo, error, setError, clearError, removeVideo, applyOutcome } =
    useVideoState({ onError, onVideoSelected, onVideoRemoved });
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const attachVideoFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (onBeforeSelect && !onBeforeSelect()) return false;
      setState("preparing");
      setError(null);
      return applyOutcome(await processVideoFile(file));
    },
    [applyOutcome, onBeforeSelect, setState, setError]
  );

  const handleVideoChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) await attachVideoFile(file);
    },
    [attachVideoFile]
  );

  return {
    state,
    attachedVideo,
    error,
    videoInputRef,
    handleVideoChange,
    attachVideoFile,
    removeVideo,
    clearError,
  };
}
