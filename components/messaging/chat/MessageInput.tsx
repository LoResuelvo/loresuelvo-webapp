import { forwardRef, useImperativeHandle } from "react";
import { AttachedFilesList } from "./AttachedFilesList";
import { ImagePreviewModal } from "@/components/messaging/media/ImagePreviewModal";
import { VideoPreview } from "@/components/messaging/media/VideoPreview";
import { MessageHiddenInputs } from "./MessageHiddenInputs";
import { MessageComposerControls } from "./MessageComposerControls";
import { useMessageComposer } from "./useMessageComposer";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";
import type { VideoUploadFailureStage } from "@/application/messaging/send-video-message";

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendAudio?: (file: File) => Promise<boolean | AudioUploadFailureStage> | boolean | AudioUploadFailureStage;
  onSendVideo?: (file: File, content?: string) => Promise<boolean | VideoUploadFailureStage> | boolean | VideoUploadFailureStage;
  disabled: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  onOpenServiceProposal?: () => void;
  disableAudio?: boolean;
  disableVideo?: boolean;
  conversationId?: string;
}

export interface MessageInputHandle {
  focus: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>((props, ref) => {
  const { value, attachedFiles = [], onAttachFiles, onRemoveFile } = props;
  const composer = useMessageComposer(props);

  useImperativeHandle(ref, () => ({
    focus: () => {
      composer.inputRef.current?.focus();
    },
  }));

  const handleTextSend = () => {
    if (value.trim() || attachedFiles.length > 0 || composer.hasAudio || composer.hasVideo) {
      composer.setError(null);
      void composer.handleSend();
    }
  };

  const errorMessage = composer.error || composer.recorderErrorMessage;

  return (
    <div className="border-t border-slate-200 bg-white relative">
      <AttachedFilesList
        files={attachedFiles}
        onPreview={(file, url) => composer.setPreviewImage({ url, name: file.name })}
        onRemove={onRemoveFile}
      />

      {composer.attachedVideo && (
        <div className="p-3 pb-0">
          <VideoPreview
            videoUrl={composer.attachedVideo.url}
            fileName={composer.attachedVideo.file.name}
            durationSeconds={composer.attachedVideo.duration}
            onRemove={composer.removeVideo}
          />
        </div>
      )}

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2.5 items-center">
        {onAttachFiles && <MessageHiddenInputs props={props} composer={composer} />}
        <MessageComposerControls props={props} composer={composer} onSendText={handleTextSend} />
      </div>

      {errorMessage && (
        <div data-testid="video-upload-error" className="px-4 pb-2 text-red-500 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <ImagePreviewModal
        open={composer.previewImage !== null}
        onClose={() => composer.setPreviewImage(null)}
        imageUrl={composer.previewImage?.url ?? ""}
        altText={composer.previewImage ? `Vista previa de ${composer.previewImage.name}` : ""}
      />
    </div>
  );
});

MessageInput.displayName = "MessageInput";

export default MessageInput;
