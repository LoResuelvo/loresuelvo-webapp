import { useCallback, useEffect, useRef, useState } from "react";
import { patchWebmDurationBlob } from "@/lib/audio/webm-duration-patcher";
import { createRecordedAudioFile } from "@/lib/audio/audio-validation";

export interface UseRecordedAudioAssetResult {
  audioBlob: Blob | null;
  audioFile: File | null;
  audioUrl: string | null;
  setRecordedBlob: (rawBlob: Blob, durationMs: number) => void;
  clearAudio: () => void;
}

export function useRecordedAudioAsset(): UseRecordedAudioAssetResult {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioUrlRef = useRef<string | null>(null);
  const activeTokenRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const revokeAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  const clearAudio = useCallback(() => {
    activeTokenRef.current += 1;
    revokeAudioUrl();
    setAudioBlob(null);
    setAudioFile(null);
  }, [revokeAudioUrl]);

  const setRecordedBlob = useCallback(
    (rawBlob: Blob, durationMs: number) => {
      revokeAudioUrl();

      if (rawBlob.size === 0) {
        setAudioBlob(null);
        setAudioFile(null);
        return;
      }

      const currentToken = activeTokenRef.current + 1;
      activeTokenRef.current = currentToken;

      const nextUrl = URL.createObjectURL(rawBlob);
      audioUrlRef.current = nextUrl;
      setAudioBlob(rawBlob);
      setAudioFile(createRecordedAudioFile(rawBlob));
      setAudioUrl(nextUrl);

      void patchWebmDurationBlob(rawBlob, durationMs).then((patchedBlob) => {
        if (isUnmountedRef.current) return;
        if (activeTokenRef.current !== currentToken) return;
        if (audioUrlRef.current !== nextUrl) return;

        URL.revokeObjectURL(nextUrl);
        const patchedUrl = URL.createObjectURL(patchedBlob);
        audioUrlRef.current = patchedUrl;
        setAudioBlob(patchedBlob);
        setAudioFile(createRecordedAudioFile(patchedBlob));
        setAudioUrl(patchedUrl);
      });
    },
    [revokeAudioUrl]
  );

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      activeTokenRef.current += 1;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  return {
    audioBlob,
    audioFile,
    audioUrl,
    setRecordedBlob,
    clearAudio,
  };
}
