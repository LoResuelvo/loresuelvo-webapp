import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_MAX_DURATION_SECONDS } from "@/lib/audio/audio-validation";

const TIMER_TICK_INTERVAL_MS = 1000;
const MILLISECONDS_PER_SECOND = 1000;
const MIN_RECORDED_AUDIO_DURATION_MS = 1000;

export interface UseAudioRecordingClockOptions {
  maxDurationSeconds?: number;
  onMaxDuration?: () => void;
}

export interface UseAudioRecordingClockResult {
  elapsedSeconds: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => { elapsedSeconds: number; durationMs: number };
  reset: () => void;
}

export function useAudioRecordingClock({
  maxDurationSeconds = AUDIO_MAX_DURATION_SECONDS,
  onMaxDuration,
}: UseAudioRecordingClockOptions = {}): UseAudioRecordingClockResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(0);
  const accumulatedDurationMsRef = useRef(0);
  const lastResumeTimeRef = useRef(0);
  const maxDurationTriggeredRef = useRef(false);

  const onMaxDurationRef = useRef(onMaxDuration);
  useEffect(() => {
    onMaxDurationRef.current = onMaxDuration;
  }, [onMaxDuration]);

  const maxDurationSecondsRef = useRef(maxDurationSeconds);
  useEffect(() => {
    maxDurationSecondsRef.current = maxDurationSeconds;
  }, [maxDurationSeconds]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    elapsedRef.current += 1;
    setElapsedSeconds(elapsedRef.current);

    if (
      elapsedRef.current >= maxDurationSecondsRef.current &&
      !maxDurationTriggeredRef.current
    ) {
      maxDurationTriggeredRef.current = true;
      onMaxDurationRef.current?.();
    }
  }, []);

  const startTimerInterval = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(tick, TIMER_TICK_INTERVAL_MS);
  }, [clearTimer, tick]);

  const start = useCallback(() => {
    clearTimer();
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    const now = Date.now();
    startTimeRef.current = now;
    lastResumeTimeRef.current = now;
    accumulatedDurationMsRef.current = 0;
    maxDurationTriggeredRef.current = false;
    startTimerInterval();
  }, [clearTimer, startTimerInterval]);

  const pause = useCallback(() => {
    if (timerRef.current !== null) {
      accumulatedDurationMsRef.current += Date.now() - lastResumeTimeRef.current;
      clearTimer();
    }
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (timerRef.current === null) {
      lastResumeTimeRef.current = Date.now();
      startTimerInterval();
    }
  }, [startTimerInterval]);

  const stop = useCallback((): { elapsedSeconds: number; durationMs: number } => {
    if (timerRef.current !== null) {
      accumulatedDurationMsRef.current += Date.now() - lastResumeTimeRef.current;
      clearTimer();
    }

    const durationMs = Math.max(
      MIN_RECORDED_AUDIO_DURATION_MS,
      accumulatedDurationMsRef.current ||
        (startTimeRef.current ? Date.now() - startTimeRef.current : 0)
    );

    accumulatedDurationMsRef.current = durationMs;
    startTimeRef.current = 0;

    const measuredSeconds = Math.max(
      1,
      Math.round(durationMs / MILLISECONDS_PER_SECOND)
    );
    const finalElapsed = elapsedRef.current > 0 ? elapsedRef.current : measuredSeconds;
    setElapsedSeconds(finalElapsed);

    return { elapsedSeconds: finalElapsed, durationMs };
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    startTimeRef.current = 0;
    accumulatedDurationMsRef.current = 0;
    lastResumeTimeRef.current = 0;
    maxDurationTriggeredRef.current = false;
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
