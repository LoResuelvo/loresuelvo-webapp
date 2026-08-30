import { useCallback, useEffect, useRef } from "react";

export interface UseMediaStreamManagerResult {
  streamRef: React.MutableRefObject<MediaStream | null>;
  acquireAudioStream: () => Promise<MediaStream>;
  stopStream: () => void;
}

export function useMediaStreamManager(): UseMediaStreamManagerResult {
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const acquireAudioStream = useCallback(async (): Promise<MediaStream> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new DOMException("MediaDevices not supported", "NotAllowedError");
    }

    stopStream();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, [stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    streamRef,
    acquireAudioStream,
    stopStream,
  };
}
