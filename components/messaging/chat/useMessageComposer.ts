import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useAudioRecorder, type AudioRecorderError } from "@/hooks/audio/useAudioRecorder";
import { validateAudioDuration, validateAudioFile } from "@/lib/audio/audio-validation";
import { t } from "@/infrastructure/i18n/translations";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";

export interface UseMessageComposerOptions {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendAudio?: (file: File) => Promise<boolean | AudioUploadFailureStage> | boolean | AudioUploadFailureStage;
  disabled?: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  disableAudio?: boolean;
}

export interface UseMessageComposerReturn {
  error: string | null;
  setError: (error: string | null) => void;
  attachedAudio: { file: File; url: string } | null;
  previewImage: { url: string; name: string } | null;
  setPreviewImage: (preview: { url: string; name: string } | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  audioUrl: string | null;
  recorderErrorMessage: string | null;
  hasAudio: boolean;
  canSendDirectly: boolean;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAudioChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAudioDurationLoaded: (duration: number) => void;
  removeAudio: () => void;
  handleRecordAudio: () => void;
  handleSend: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export function useMessageComposer({
  value,
  onChange,
  onSend,
  onSendAudio,
  attachedFiles = [],
  onAttachFiles,
  onRemoveFile,
  disableAudio = false,
}: UseMessageComposerOptions): UseMessageComposerReturn {
  const [error, setError] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<{ file: File; url: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    isRecording,
    isPaused,
    elapsedSeconds,
    audioFile,
    audioUrl,
    error: recorderError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const hasAudio = !!attachedAudio || !!audioFile || isRecording;

  const recorderErrorMessage = recorderError
    ? t.messaging.audioRecorder.errors[recorderError as AudioRecorderError]
    : null;

  useEffect(() => {
    return () => {
      if (attachedAudio) URL.revokeObjectURL(attachedAudio.url);
    };
  }, [attachedAudio]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onAttachFiles) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          setError(t.messaging.fileTooLarge);
          return false;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          setError(t.messaging.photoInvalidFormat);
          return false;
        }

        return true;
      });
      if (validFiles.length > 0) {
        setError(null);
        onAttachFiles(validFiles);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAudioChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disableAudio) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const audioValidationError = validateAudioFile(file);
    if (audioValidationError) {
      setError(t.messaging.audioAttachment[audioValidationError]);
      e.target.value = "";
      return;
    }

    cancelRecording();
    setAttachedAudio({ file, url: URL.createObjectURL(file) });
    onChange("");
    for (let index = 0; index < attachedFiles.length; index += 1) {
      onRemoveFile?.(0);
    }
    setError(null);
    e.target.value = "";
  };

  const handleAudioDurationLoaded = (duration: number) => {
    const durationError = validateAudioDuration(duration);
    if (durationError) {
      setError(t.messaging.audioAttachment.durationTooLong);
      setAttachedAudio(null);
      cancelRecording();
      return;
    }

    setError(null);
  };

  const removeAudio = () => {
    setAttachedAudio(null);
  };

  const handleRecordAudio = () => {
    if (disableAudio) return;
    void startRecording().then((started) => {
      if (!started) return;
      setAttachedAudio(null);
      onChange("");
      for (let index = 0; index < attachedFiles.length; index += 1) {
        onRemoveFile?.(0);
      }
    });
  };

  const handleSend = async () => {
    const audioFileToSend = attachedAudio?.file ?? audioFile;

    if (audioFileToSend && onSendAudio) {
      try {
        const sent = await onSendAudio(audioFileToSend);
        if (sent !== true) {
          if (sent) setError(t.messaging.audioUpload.errors[sent]);
          return;
        }
        setAttachedAudio(null);
        cancelRecording();
      } catch {
        setError(t.messaging.audioUpload.errors.send);
      }
      return;
    }

    onSend();
    setAttachedAudio(null);
    cancelRecording();
  };

  const canSendDirectly =
    !!value.trim() || attachedFiles.length > 0 || !!attachedAudio || !!audioFile;

  return {
    error,
    setError,
    attachedAudio,
    previewImage,
    setPreviewImage,
    fileInputRef,
    audioInputRef,
    inputRef,
    isRecording,
    isPaused,
    elapsedSeconds,
    audioUrl,
    recorderErrorMessage,
    hasAudio,
    canSendDirectly,
    handleFileChange,
    handleAudioChange,
    handleAudioDurationLoaded,
    removeAudio,
    handleRecordAudio,
    handleSend,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
