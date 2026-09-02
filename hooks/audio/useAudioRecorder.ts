import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUDIO_ALLOWED_MIME_TYPES,
  AUDIO_MAX_DURATION_SECONDS,
  DEFAULT_AUDIO_MIME_TYPE,
} from "@/lib/audio/audio-validation";
import { useMediaStreamManager } from "./useMediaStreamManager";
import { useAudioRecordingClock } from "./useAudioRecordingClock";
import { useRecordedAudioAsset } from "./useRecordedAudioAsset";

export type AudioRecorderError =
  | "unsupported"
  | "permissionDenied"
  | "recordingFailed"
  | "maxDuration";

interface UseAudioRecorderOptions {
  maxDurationSeconds?: number;
}

export interface UseAudioRecorderResult {
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  audioFile: File | null;
  audioUrl: string | null;
  error: AudioRecorderError | null;
  startRecording: () => Promise<boolean>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

function supportedAudioMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const mimeType of AUDIO_ALLOWED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      return null;
    }
  }

  return null;
}

export function useAudioRecorder({
  maxDurationSeconds = AUDIO_MAX_DURATION_SECONDS,
}: UseAudioRecorderOptions = {}): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<AudioRecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);

  const { acquireAudioStream, stopStream } = useMediaStreamManager();
  const { audioBlob, audioFile, audioUrl, setRecordedBlob, clearAudio } =
    useRecordedAudioAsset();
  const stopRecordingRef = useRef<() => void>(() => {});

  const handleMaxDuration = useCallback(() => {
    setError("maxDuration");
    stopRecordingRef.current();
  }, []);

  const {
    elapsedSeconds,
    start: startClock,
    pause: pauseClock,
    resume: resumeClock,
    stop: stopClock,
    reset: resetClock,
  } = useAudioRecordingClock({
    maxDurationSeconds,
    onMaxDuration: handleMaxDuration,
  });

  const stopRecording = useCallback(() => {
    setIsPaused(false);
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }

    stopClock();
    setIsRecording(false);
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [stopClock]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (event.data.size > 0) {
      chunksRef.current.push(event.data);
    }
  }, []);

  const handleRecorderError = useCallback(() => {
    resetClock();
    stopStream();
    recorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setError("recordingFailed");
  }, [resetClock, stopStream]);

  const handleRecorderStop = useCallback(() => {
    stopStream();
    recorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);

    if (cancelledRef.current) {
      cancelledRef.current = false;
      chunksRef.current = [];
      resetClock();
      return;
    }

    const { durationMs } = stopClock();

    const rawBlob = new Blob(chunksRef.current, { type: DEFAULT_AUDIO_MIME_TYPE });
    chunksRef.current = [];

    if (rawBlob.size === 0) {
      setError("recordingFailed");
      clearAudio();
      return;
    }

    setRecordedBlob(rawBlob, durationMs);
  }, [clearAudio, resetClock, setRecordedBlob, stopClock, stopStream]);

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      pauseClock();
      setIsPaused(true);
    }
  }, [pauseClock]);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      resumeClock();
      setIsPaused(false);
    }
  }, [resumeClock]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    resetClock();
    setIsPaused(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopStream();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setError(null);
    clearAudio();
  }, [clearAudio, resetClock, stopStream]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecording) return false;

    const mimeType = supportedAudioMimeType();
    if (!mimeType) {
      setError("unsupported");
      return false;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("permissionDenied");
      return false;
    }

    clearAudio();
    setError(null);
    cancelledRef.current = false;
    setIsPaused(false);

    let stream: MediaStream;
    try {
      stream = await acquireAudioStream();
    } catch {
      setError("permissionDenied");
      return false;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("unsupported");
      return false;
    }

    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = handleDataAvailable;
    recorder.onerror = handleRecorderError;
    recorder.onstop = handleRecorderStop;

    recorder.start();
    setIsRecording(true);
    startClock();
    return true;
  }, [
    acquireAudioStream,
    clearAudio,
    handleDataAvailable,
    handleRecorderError,
    handleRecorderStop,
    isRecording,
    startClock,
  ]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      recorderRef.current?.stop();
      stopStream();
    };
  }, [stopStream]);

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    audioBlob,
    audioFile,
    audioUrl,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
