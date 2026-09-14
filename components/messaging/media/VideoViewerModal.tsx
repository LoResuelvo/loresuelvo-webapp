"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

export interface VideoViewerModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  originalName?: string;
  onRefreshUrl?: () => Promise<string | null>;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface VideoPlaybackErrorProps {
  onRetry: () => void;
  onClose: () => void;
}

function VideoPlaybackError({ onRetry, onClose }: VideoPlaybackErrorProps) {
  return (
    <div
      data-testid="video-playback-error"
      className="flex flex-col items-center justify-center p-6 text-center gap-3 text-white max-w-md"
    >
      <AlertCircle className="w-12 h-12 text-red-500 shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-200">
        {t.messaging.videoViewer.playbackError}
      </p>
      <div className="flex gap-3 mt-3">
        <Button
          variant="brand"
          size="sm"
          onClick={onRetry}
          data-testid="video-retry-button"
          className="cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t.messaging.videoViewer.retryLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid="video-close-button"
          className="text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          {t.messaging.videoViewer.closeLabel}
        </Button>
      </div>
    </div>
  );
}

function useVideoViewer(
  open: boolean,
  videoUrl: string,
  onClose: () => void,
  onRefreshUrl?: () => Promise<string | null>,
  triggerRef?: React.RefObject<HTMLElement | null>
) {
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (open) {
      setHasError(false);
      setCurrentUrl(videoUrl);
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [open, videoUrl]);

  const handleClose = useCallback(() => {
    videoRef.current?.pause();
    onClose();
  }, [onClose]);

  const handleRetry = async () => {
    setHasError(false);
    if (onRefreshUrl) {
      try {
        const refreshed = await onRefreshUrl();
        if (refreshed) setCurrentUrl(refreshed);
      } catch {
        // Fallback to reloading existing URL
      }
    }
    videoRef.current?.load();
  };

  const handleAutoFocus = (e: Event) => {
    if (triggerRef?.current) {
      e.preventDefault();
      triggerRef.current.focus();
    }
  };

  return {
    hasError,
    setHasError,
    currentUrl,
    videoRef,
    handleClose,
    handleRetry,
    handleAutoFocus,
  };
}

export function VideoViewerModal({
  open,
  onClose,
  videoUrl,
  originalName,
  onRefreshUrl,
  triggerRef,
}: VideoViewerModalProps) {
  const {
    hasError,
    setHasError,
    currentUrl,
    videoRef,
    handleClose,
    handleRetry,
    handleAutoFocus,
  } = useVideoViewer(open, videoUrl, onClose, onRefreshUrl, triggerRef);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      onCloseAutoFocus={handleAutoFocus}
      title={originalName || t.messaging.videoViewer.title}
      closeLabel={t.messaging.videoViewer.closeLabel}
      variant="dark"
      className="w-[95vw] max-w-4xl h-[85vh] max-h-[90vh] bg-black text-white border border-slate-800 rounded-2xl overflow-hidden p-0"
    >
      <div
        data-testid="video-viewer-modal"
        className="w-full h-full flex flex-col items-center justify-center bg-black relative p-3 overflow-hidden"
      >
        {hasError ? (
          <VideoPlaybackError onRetry={handleRetry} onClose={handleClose} />
        ) : (
          <video
            ref={videoRef}
            src={currentUrl}
            controls
            playsInline
            autoPlay={false}
            data-testid="video-viewer-player"
            className="max-w-full max-h-full object-contain rounded-lg"
            onError={() => setHasError(true)}
            onCanPlay={() => setHasError(false)}
          />
        )}
      </div>
    </Modal>
  );
}
