import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import Image from "next/image";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { AttachmentMenu } from "@/components/messaging/AttachmentMenu";
import { AudioPreview, formatAudioDuration } from "@/components/messaging/AudioPreview";
import { useAudioRecorder, type AudioRecorderError } from "@/hooks/useAudioRecorder";
import { isSupportedAudioFile } from "@/lib/audio-validation";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onOpenServiceProposal?: () => void;
}

export interface MessageInputHandle {
  focus: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  ({ value, onChange, onSend, disabled, attachedFiles = [], onAttachFiles, onRemoveFile, onOpenServiceProposal }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [attachedAudio, setAttachedAudio] = useState<{ file: File; url: string } | null>(null);
    const {
      isRecording,
      elapsedSeconds,
      audioBlob,
      audioUrl,
      error: recorderError,
      startRecording,
      stopRecording,
      cancelRecording,
    } = useAudioRecorder();
    const hasAudio = !!attachedAudio || !!audioBlob || isRecording;

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
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isSupportedAudioFile(file)) {
        setError(t.messaging.audioAttachment.invalidFormat);
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

    const removeAudio = () => setAttachedAudio(null);

    const handleRecordAudio = () => {
      void startRecording().then((started) => {
        if (!started) return;
        onChange("");
        for (let index = 0; index < attachedFiles.length; index += 1) {
          onRemoveFile?.(0);
        }
      });
    };

    const handleSend = () => {
      onSend();
      setAttachedAudio(null);
      cancelRecording();
    };

    const [previewImage, setPreviewImage] = useState<{url: string, name: string} | null>(null);

    return (
      <div className="flex flex-col border-t border-slate-200 bg-white flex-shrink-0">
        {attachedFiles.length > 0 && !hasAudio && (
          <div className="p-3 pb-0 flex gap-2 overflow-x-auto">
            {attachedFiles.map((file, idx) => {
              const url = URL.createObjectURL(file);
              return (
                <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url, name: file.name })}
                    className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 bg-slate-50 relative cursor-pointer block hover:ring-2 hover:ring-brand-primary/50 transition-all"
                  >
                    <Image
                      src={url}
                      alt={`${t.messaging.previewTitle} ${file.name}`}
                      fill
                      className="object-cover"
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
        <div className="p-4 flex gap-3 items-center">
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
                disabled={disabled || !!attachedAudio}
              />
              <AttachmentMenu
                onAttachImages={() => fileInputRef.current?.click()}
                onAttachAudio={() => audioInputRef.current?.click()}
                onRecordAudio={handleRecordAudio}
                onCreateProposal={onOpenServiceProposal}
                showProposalOption={!!onOpenServiceProposal}
                disabled={disabled || attachedFiles.length >= 5 || hasAudio}
              />
            </>
          )}
          {isRecording && (
            <div
              data-testid="audio-recording"
              role="status"
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <span>{t.messaging.audioRecorder.recordingLabel} {formatAudioDuration(elapsedSeconds)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopRecording}
                aria-label={t.messaging.audioRecorder.stopLabel}
              >
                {t.messaging.audioRecorder.stopLabel}
              </Button>
            </div>
          )}
          {!isRecording && attachedAudio && (
            <AudioPreview
              audioUrl={attachedAudio.url}
              fileName={attachedAudio.file.name}
              onRemove={removeAudio}
            />
          )}
          {!isRecording && !attachedAudio && audioUrl && (
            <AudioPreview
              audioUrl={audioUrl}
              fileName={t.messaging.audioRecorder.recordedFileName}
              onRemove={cancelRecording}
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
            className="flex-1 px-4 h-[48px] rounded-xl border border-slate-200 bg-white text-body focus-visible:ring-brand-secondary/40"
            disabled={disabled || hasAudio}
          />
          <Button
            variant="brand"
            type="button"
            onClick={handleSend}
            disabled={disabled || isRecording || (!value.trim() && attachedFiles.length === 0 && !hasAudio)}
            aria-label={t.messaging.sendLabel}
            className="h-[48px] px-5 rounded-xl font-semibold"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
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
