import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Mic, Pause, Send, Square, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import Image from "next/image";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { AttachmentMenu } from "@/components/messaging/AttachmentMenu";
import { AudioPreview, formatAudioDuration } from "@/components/messaging/AudioPreview";
import { useAudioRecorder, type AudioRecorderError } from "@/hooks/useAudioRecorder";
import { validateAudioDuration, validateAudioFile } from "@/lib/audio-validation";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendAudio?: (file: File) => Promise<boolean | AudioUploadFailureStage> | boolean | AudioUploadFailureStage;
  disabled: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onOpenServiceProposal?: () => void;
  disableAudio?: boolean;
}

export interface MessageInputHandle {
  focus: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ value, onChange, onSend, onSendAudio, disabled, attachedFiles = [], onAttachFiles, onRemoveFile, onOpenServiceProposal, disableAudio = false }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [attachedAudio, setAttachedAudio] = useState<{ file: File; url: string } | null>(null);
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

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onAttachFiles) {
        const filesArray = Array.from(e.target.files);
        const validFiles = filesArray.filter(file => {
          if (file.size > 5 * 1024 * 1024) {
            setError(t.messaging.fileTooLarge);
            return false;
          }
          
          // Validate valid types
          const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
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
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);

    const canSendDirectly = !!value.trim() || attachedFiles.length > 0 || !!attachedAudio || !!audioFile;

    return (
      <div className="border-t border-slate-200 bg-white relative">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="p-4 pb-0 flex flex-wrap gap-2">
            {attachedFiles.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
              <div key={idx} className="relative group">
                <button
                  type="button"
                  onClick={() => setPreviewImage({ url, name: file.name })}
                  className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 block hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  aria-label={`Ver vista previa de ${file.name}`}
                >
                  <Image
                    src={url}
                    alt={file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              );
            })}
          </div>
        )}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 items-center">
          {onAttachFiles && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                multiple
                onChange={handleFileChange}
                disabled={disabled || attachedFiles.length >= 5 || hasAudio}
              />
              <input
                type="file"
                ref={audioInputRef}
                className="hidden"
                accept="audio/webm"
                onChange={handleAudioChange}
                disabled={disabled || disableAudio || !!attachedAudio}
              />
            </>
          )}

          {isRecording ? (
            <div
              data-testid="audio-recording"
              role="status"
              className="flex-1 flex items-center justify-between gap-3 px-4 h-[44px] rounded-full border border-slate-200 bg-white shadow-sm animate-in fade-in duration-200"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                aria-label={t.messaging.audioRecorder.cancelLabel}
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full shrink-0 transition-colors"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>

              <div className="flex-1 flex items-center gap-2 px-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    isPaused ? "bg-amber-500" : "bg-red-500 animate-pulse"
                  }`}
                />
                <div className="flex-1 flex items-center gap-[3px] h-3.5">
                  {[40, 75, 95, 60, 80, 100, 50, 85, 65, 45, 75, 90, 60, 40, 80].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`w-[2.5px] rounded-full transition-all ${
                        isPaused ? "bg-slate-300" : "bg-red-400 animate-pulse"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <span className="font-mono text-xs font-semibold text-slate-600 shrink-0">
                {formatAudioDuration(elapsedSeconds)}
              </span>

              {/* Pause / Resume Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isPaused ? resumeRecording : pauseRecording}
                aria-label={
                  isPaused
                    ? t.messaging.audioRecorder.resumeLabel
                    : t.messaging.audioRecorder.pauseLabel
                }
                className="h-8 w-8 text-slate-600 hover:text-slate-900 rounded-full shrink-0 transition-colors cursor-pointer"
              >
                {isPaused ? (
                  <Mic className="h-4 w-4 text-red-500" aria-hidden="true" />
                ) : (
                  <Pause className="h-4 w-4 text-slate-600" aria-hidden="true" />
                )}
              </Button>

              {/* Stop & Finish Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={stopRecording}
                aria-label={t.messaging.audioRecorder.stopLabel}
                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full shrink-0 transition-colors cursor-pointer"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              </Button>
            </div>
          ) : attachedAudio ? (
            <AudioPreview
              audioUrl={attachedAudio.url}
              fileName={attachedAudio.file.name}
              onRemove={removeAudio}
              onDurationLoaded={handleAudioDurationLoaded}
            />
          ) : audioUrl ? (
            <AudioPreview
              audioUrl={audioUrl}
              fileName={t.messaging.audioRecorder.recordedFileName}
              onRemove={cancelRecording}
              onDurationLoaded={handleAudioDurationLoaded}
            />
          ) : (
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm min-h-[44px]">
              {onAttachFiles && (
                <AttachmentMenu
                  onAttachImages={() => fileInputRef.current?.click()}
                  onAttachAudio={() => audioInputRef.current?.click()}
                  onCreateProposal={onOpenServiceProposal}
                  showProposalOption={!!onOpenServiceProposal}
                  disabled={disabled || attachedFiles.length >= 5 || hasAudio}
                  audioDisabled={disableAudio}
                />
              )}

              <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (value.trim() || attachedFiles.length > 0 || hasAudio) {
                      setError(null);
                      handleSend();
                    }
                  }
                }}
                placeholder={t.messaging.inputPlaceholder}
                className="flex-1 h-9 border-none bg-transparent shadow-none px-1 text-sm focus-visible:ring-0 text-slate-800 placeholder:text-slate-400"
                disabled={disabled || hasAudio}
              />
            </div>
          )}

          {/* Action Button: Send or Mic */}
          {canSendDirectly ? (
            <Button
              variant="brand"
              type="button"
              onClick={handleSend}
              disabled={disabled || isRecording || (!value.trim() && attachedFiles.length === 0 && !hasAudio)}
              aria-label={t.messaging.sendLabel}
              className="h-11 w-11 rounded-full p-0 flex items-center justify-center font-semibold shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-5 h-5" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="brand"
              type="button"
              onClick={handleRecordAudio}
              disabled={disabled || disableAudio}
              aria-label={t.messaging.audioRecorder.startLabel}
              className="h-11 w-11 rounded-full p-0 flex items-center justify-center text-white bg-brand-primary hover:bg-brand-primary/90 shadow-sm shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
            </Button>
          )}
        </div>
        {(error || recorderErrorMessage) && (
          <div className="px-4 pb-2 text-red-500 text-sm font-medium">
            {error || recorderErrorMessage}
          </div>
        )}
        {/* Image Preview Modal */}
        <ImagePreviewModal
          open={previewImage !== null}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage?.url ?? ""}
          altText={previewImage ? `${t.messaging.previewTitle} ${previewImage.name}` : ""}
        />
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
