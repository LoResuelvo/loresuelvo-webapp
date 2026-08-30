import { forwardRef, useImperativeHandle } from "react";
import { Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { ImagePreviewModal } from "@/components/messaging/media/ImagePreviewModal";
import { AttachmentMenu } from "@/components/messaging/media/AttachmentMenu";
import { AudioPreview } from "@/components/messaging/media/AudioPreview";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";
import { useMessageComposer } from "./useMessageComposer";
import { AudioRecordingControls } from "./AudioRecordingControls";
import { AttachedFilesList } from "./AttachedFilesList";
import { MessageTextInput } from "./MessageTextInput";

export interface MessageInputProps {
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

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>((props, ref) => {
  const {
    value,
    onChange,
    disabled,
    attachedFiles = [],
    onAttachFiles,
    onRemoveFile,
    onOpenServiceProposal,
    disableAudio = false,
  } = props;

  const composer = useMessageComposer(props);

  useImperativeHandle(ref, () => ({
    focus: () => {
      composer.inputRef.current?.focus();
    },
  }));

  const handleTextSend = () => {
    if (value.trim() || attachedFiles.length > 0 || composer.hasAudio) {
      composer.setError(null);
      void composer.handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white relative">
      <AttachedFilesList
        files={attachedFiles}
        onPreview={(file, url) => composer.setPreviewImage({ url, name: file.name })}
        onRemove={onRemoveFile}
      />

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 items-center">
        {onAttachFiles && (
          <>
            <input
              type="file"
              ref={composer.fileInputRef}
              className="hidden"
              accept="image/jpeg, image/png, image/webp"
              multiple
              onChange={composer.handleFileChange}
              disabled={disabled || attachedFiles.length >= 5 || composer.hasAudio}
            />
            <input
              type="file"
              ref={composer.audioInputRef}
              className="hidden"
              accept="audio/webm"
              onChange={composer.handleAudioChange}
              disabled={disabled || disableAudio || !!composer.attachedAudio}
            />
          </>
        )}

        {composer.isRecording ? (
          <AudioRecordingControls
            isPaused={composer.isPaused}
            elapsedSeconds={composer.elapsedSeconds}
            onCancel={composer.cancelRecording}
            onPause={composer.pauseRecording}
            onResume={composer.resumeRecording}
            onStop={composer.stopRecording}
          />
        ) : composer.attachedAudio ? (
          <AudioPreview
            audioUrl={composer.attachedAudio.url}
            fileName={composer.attachedAudio.file.name}
            onRemove={composer.removeAudio}
            onDurationLoaded={composer.handleAudioDurationLoaded}
          />
        ) : composer.audioUrl ? (
          <AudioPreview
            audioUrl={composer.audioUrl}
            fileName={t.messaging.audioRecorder.recordedFileName}
            onRemove={composer.cancelRecording}
            onDurationLoaded={composer.handleAudioDurationLoaded}
          />
        ) : (
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm min-h-[44px]">
            {onAttachFiles && (
              <AttachmentMenu
                onAttachImages={() => composer.fileInputRef.current?.click()}
                onAttachAudio={() => composer.audioInputRef.current?.click()}
                onCreateProposal={onOpenServiceProposal}
                showProposalOption={!!onOpenServiceProposal}
                disabled={disabled || attachedFiles.length >= 5 || composer.hasAudio}
                audioDisabled={disableAudio}
              />
            )}

            <MessageTextInput
              ref={composer.inputRef}
              value={value}
              onChange={onChange}
              onSend={handleTextSend}
              disabled={disabled || composer.hasAudio}
            />
          </div>
        )}

        {composer.canSendDirectly ? (
          <Button
            variant="brand"
            type="button"
            onClick={composer.handleSend}
            disabled={disabled || composer.isRecording || (!value.trim() && attachedFiles.length === 0 && !composer.hasAudio)}
            aria-label={t.messaging.sendLabel}
            className="h-11 w-11 rounded-full p-0 flex items-center justify-center font-semibold shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="brand"
            type="button"
            onClick={composer.handleRecordAudio}
            disabled={disabled || disableAudio}
            aria-label={t.messaging.audioRecorder.startLabel}
            className="h-11 w-11 rounded-full p-0 flex items-center justify-center text-white bg-brand-primary hover:bg-brand-primary/90 shadow-sm shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="w-5 h-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {(composer.error || composer.recorderErrorMessage) && (
        <div className="px-4 pb-2 text-red-500 text-sm font-medium">
          {composer.error || composer.recorderErrorMessage}
        </div>
      )}

      <ImagePreviewModal
        open={composer.previewImage !== null}
        onClose={() => composer.setPreviewImage(null)}
        imageUrl={composer.previewImage?.url ?? ""}
        altText={composer.previewImage ? `${t.messaging.previewTitle} ${composer.previewImage.name}` : ""}
      />
    </div>
  );
});

MessageInput.displayName = "MessageInput";

export default MessageInput;
