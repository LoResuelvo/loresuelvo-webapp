import { useCallback, useEffect, useRef, useState } from "react";
import { patchWebmDurationBlob } from "@/lib/webm-duration-patcher";
import {
  AUDIO_ALLOWED_MIME_TYPES,
  AUDIO_MAX_DURATION_SECONDS,
  DEFAULT_AUDIO_MIME_TYPE,
  createRecordedAudioFile,
} from "@/lib/audio-validation";

export type AudioRecorderError =
  | "unsupported"
  | "permissionDenied"
  | "recordingFailed"
  | "maxDuration";

const TIMER_TICK_INTERVAL_MS = 1000;
const MILLISECONDS_PER_SECOND = 1000;
const MIN_RECORDED_AUDIO_DURATION_MS = 1000;

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<AudioRecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const startTimeRef = useRef(0);
  const accumulatedDurationMsRef = useRef(0);
  const lastResumeTimeRef = useRef(0);

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
    setAudioFile(null);
  }, [revokeAudioUrl]);

  const stopRecording = useCallback(() => {
    clearTimer();
    setIsPaused(false);
    const recorder = recorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    if (recorder.state !== "inactive") {
      if (recorder.state === "recording") {
        accumulatedDurationMsRef.current += Date.now() - lastResumeTimeRef.current;
      }
      recorder.stop();
    }
  }, [clearTimer]);

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      accumulatedDurationMsRef.current += Date.now() - lastResumeTimeRef.current;
      clearTimer();
      setIsPaused(true);
    }
  }, [clearTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      lastResumeTimeRef.current = Date.now();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsedSeconds(elapsedRef.current);
        if (elapsedRef.current >= maxDurationSeconds) {
          setError("maxDuration");
          stopRecording();
        }
      }, TIMER_TICK_INTERVAL_MS);
    }
  }, [maxDurationSeconds, stopRecording]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    setIsPaused(false);
    accumulatedDurationMsRef.current = 0;
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
    startTimeRef.current = Date.now();
    lastResumeTimeRef.current = Date.now();
    accumulatedDurationMsRef.current = 0;
    cancelledRef.current = false;
    setIsPaused(false);

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
      setIsPaused(false);
      setError("recordingFailed");
    };
    recorder.onstop = () => {
      clearTimer();
      stopStream();
      recorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      const measuredSeconds = Math.max(
        1,
        Math.round(
          (accumulatedDurationMsRef.current || Date.now() - startTimeRef.current) /
            MILLISECONDS_PER_SECOND
        )
      );
      const finalElapsed = elapsedRef.current > 0 ? elapsedRef.current : measuredSeconds;
      setElapsedSeconds(finalElapsed);

      if (cancelledRef.current) {
        cancelledRef.current = false;
        chunksRef.current = [];
        return;
      }

      const rawBlob = new Blob(chunksRef.current, { type: DEFAULT_AUDIO_MIME_TYPE });
      chunksRef.current = [];
      if (rawBlob.size === 0) {
        setError("recordingFailed");
        clearAudio();
        return;
      }

      revokeAudioUrl();
      const nextUrl = URL.createObjectURL(rawBlob);
      audioUrlRef.current = nextUrl;
      setAudioBlob(rawBlob);
      setAudioFile(createRecordedAudioFile(rawBlob));
      setAudioUrl(nextUrl);

      const durationMs = Math.max(
        MIN_RECORDED_AUDIO_DURATION_MS,
        accumulatedDurationMsRef.current || Date.now() - startTimeRef.current
      );
      void patchWebmDurationBlob(rawBlob, durationMs).then((patchedBlob) => {
        if (cancelledRef.current) return;
        if (audioUrlRef.current === nextUrl) {
          URL.revokeObjectURL(nextUrl);
          const patchedUrl = URL.createObjectURL(patchedBlob);
          audioUrlRef.current = patchedUrl;
          setAudioBlob(patchedBlob);
          setAudioFile(createRecordedAudioFile(patchedBlob));
          setAudioUrl(patchedUrl);
        }
      });
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
    }, TIMER_TICK_INTERVAL_MS);
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
