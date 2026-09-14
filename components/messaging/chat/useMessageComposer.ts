import { useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useAudioRecorder, type AudioRecorderError } from "@/hooks/audio/useAudioRecorder";
import { useAudioAttachment, type AttachedAudio } from "@/hooks/audio/useAudioAttachment";
import { useVideoAttachment, type AttachedVideo } from "@/hooks/video/useVideoAttachment";
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
  attachedAudio: AttachedAudio | null;
  attachedVideo: AttachedVideo | null;
  previewImage: { url: string; name: string } | null;
  setPreviewImage: (preview: { url: string; name: string } | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  audioInputRef: RefObject<HTMLInputElement | null>;
  videoInputRef: RefObject<HTMLInputElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  isRecording: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  audioUrl: string | null;
  recorderErrorMessage: string | null;
  hasAudio: boolean;
  hasVideo: boolean;
  canSendDirectly: boolean;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleAudioChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleVideoChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAudioDurationLoaded: (duration: number) => void;
  removeAudio: () => void;
  removeVideo: () => void;
  handleRecordAudio: () => void;
  handleSend: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export function filterValidImageFiles(files: FileList | File[]): {
  validFiles: File[];
  errorKey: "fileTooLarge" | "photoInvalidFormat" | null;
} {
  const fileArray = Array.from(files);
  const validFiles: File[] = [];
  let errorKey: "fileTooLarge" | "photoInvalidFormat" | null = null;
  for (const file of fileArray) {
    if (file.size > 5 * 1024 * 1024) {
      errorKey = "fileTooLarge";
      continue;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      errorKey = "photoInvalidFormat";
      continue;
    }
    validFiles.push(file);
  }
  return { validFiles, errorKey };
}

function processImageFilesChange(
  files: FileList | null,
  onAttachFiles?: (files: File[]) => void
): { errorKey: "fileTooLarge" | "photoInvalidFormat" | null; validCount: number } {
  if (!files || !onAttachFiles) return { errorKey: null, validCount: 0 };
  const { validFiles, errorKey } = filterValidImageFiles(files);
  if (validFiles.length > 0) onAttachFiles(validFiles);
  return { errorKey, validCount: validFiles.length };
}

async function executeComposerSend({
  audioFile,
  onSendAudio,
  onSend,
  onSuccess,
  onError,
}: {
  audioFile?: File | null;
  onSendAudio?: (file: File) => Promise<boolean | AudioUploadFailureStage> | boolean | AudioUploadFailureStage;
  onSend: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  if (audioFile && onSendAudio) {
    try {
      const sent = await onSendAudio(audioFile);
      if (sent !== true) {
        if (sent) onError(t.messaging.audioUpload.errors[sent]);
        return;
      }
      onSuccess();
    } catch {
      onError(t.messaging.audioUpload.errors.send);
    }
    return;
  }
  onSend();
  onSuccess();
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
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const recorder = useAudioRecorder();

  const clearInputs = () => {
    onChange("");
    for (let index = 0; index < attachedFiles.length; index += 1) onRemoveFile?.(0);
  };

  const audioAttachment = useAudioAttachment({
    disabled: disableAudio,
    onError: setError,
    onClearError: () => setError(null),
    onBeforeAttach: () => {
      if (!videoAttachment.attachedVideo) return true;
      setError(t.messaging.videoAttachment.incompatibleAttachment);
      return false;
    },
    onAudioAttached: () => {
      recorder.cancelRecording();
      clearInputs();
    },
  });

  const hasAudio = !!audioAttachment.attachedAudio || !!recorder.audioFile || recorder.isRecording;

  const videoAttachment = useVideoAttachment({
    onBeforeSelect: () => {
      if (!attachedFiles.length && !hasAudio) return true;
      setError(t.messaging.videoAttachment.incompatibleAttachment);
      return false;
    },
    onError: (err) => setError(t.messaging.videoAttachment[err]),
  });

  const hasVideo = !!videoAttachment.attachedVideo;

  const recorderErrorMessage = recorder.error
    ? t.messaging.audioRecorder.errors[recorder.error as AudioRecorderError]
    : null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (hasVideo) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return setError(t.messaging.videoAttachment.incompatibleAttachment);
    }
    const { errorKey, validCount } = processImageFilesChange(files, onAttachFiles);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (validCount > 0) setError(null);
    else if (errorKey) setError(t.messaging[errorKey]);
  };

  const handleRecordAudio = () => {
    if (disableAudio) return;
    if (hasVideo) return setError(t.messaging.videoAttachment.incompatibleAttachment);
    void recorder.startRecording().then((started) => {
      if (started) {
        audioAttachment.removeAudio();
        clearInputs();
      }
    });
  };

  const handleSend = () =>
    executeComposerSend({
      audioFile: audioAttachment.attachedAudio?.file ?? recorder.audioFile,
      onSendAudio,
      onSend,
      onSuccess: () => {
        audioAttachment.removeAudio();
        recorder.cancelRecording();
        videoAttachment.removeVideo();
      },
      onError: setError,
    });

  const canSendDirectly = !!value.trim() || attachedFiles.length > 0 || hasAudio || hasVideo;

  return {
    error, setError, previewImage, setPreviewImage, fileInputRef, inputRef,
    attachedAudio: audioAttachment.attachedAudio, attachedVideo: videoAttachment.attachedVideo,
    audioInputRef: audioAttachment.audioInputRef, videoInputRef: videoAttachment.videoInputRef,
    isRecording: recorder.isRecording, isPaused: recorder.isPaused,
    elapsedSeconds: recorder.elapsedSeconds, audioUrl: recorder.audioUrl,
    recorderErrorMessage, hasAudio, hasVideo, canSendDirectly,
    handleFileChange,
    handleAudioChange: audioAttachment.handleAudioChange,
    handleVideoChange: videoAttachment.handleVideoChange,
    handleAudioDurationLoaded: audioAttachment.handleAudioDurationLoaded,
    removeAudio: audioAttachment.removeAudio, removeVideo: videoAttachment.removeVideo,
    handleRecordAudio, handleSend,
    pauseRecording: recorder.pauseRecording, resumeRecording: recorder.resumeRecording,
    stopRecording: recorder.stopRecording, cancelRecording: recorder.cancelRecording,
  };
}
