import { useCallback, useEffect, useRef, useState } from "react";

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
  elapsedSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: AudioRecorderError | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

const AUDIO_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm"];

function supportedAudioMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const mimeType of AUDIO_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      return null;
    }
  }

  return null;
}

export function useAudioRecorder({ maxDurationSeconds = 300 }: UseAudioRecorderOptions = {}): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<AudioRecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  const clearAudio = useCallback(() => {
    revokeAudioUrl();
    setAudioBlob(null);
  }, [revokeAudioUrl]);

  const stopRecording = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [clearTimer]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopStream();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setElapsedSeconds(0);
    setError(null);
    clearAudio();
  }, [clearAudio, clearTimer, stopStream]);

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
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    cancelledRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      clearTimer();
      stopStream();
      recorderRef.current = null;
      setIsRecording(false);
      setError("recordingFailed");
    };
    recorder.onstop = () => {
      clearTimer();
      stopStream();
      recorderRef.current = null;
      setIsRecording(false);
      setElapsedSeconds(elapsedRef.current);

      if (cancelledRef.current) {
        cancelledRef.current = false;
        chunksRef.current = [];
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setError("recordingFailed");
        clearAudio();
        return;
      }

      revokeAudioUrl();
      const nextUrl = URL.createObjectURL(blob);
      audioUrlRef.current = nextUrl;
      setAudioBlob(blob);
      setAudioUrl(nextUrl);
    };

    recorder.start();
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
      if (elapsedRef.current >= maxDurationSeconds) {
        setError("maxDuration");
        stopRecording();
      }
    }, 1000);
    return true;
  }, [clearAudio, clearTimer, isRecording, maxDurationSeconds, revokeAudioUrl, stopRecording, stopStream]);

  useEffect(() => {
    return () => {
      clearTimer();
      cancelledRef.current = true;
      recorderRef.current?.stop();
      stopStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [clearTimer, stopStream]);

  return {
    isRecording,
    elapsedSeconds,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
