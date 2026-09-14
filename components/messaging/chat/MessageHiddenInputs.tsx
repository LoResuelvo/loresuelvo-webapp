import type { MessageInputProps } from "./MessageInput";
import type { UseMessageComposerReturn } from "./useMessageComposer";

export interface MessageHiddenInputsProps {
  props: MessageInputProps;
  composer: UseMessageComposerReturn;
}

export function MessageHiddenInputs({ props, composer }: MessageHiddenInputsProps) {
  const { disabled, disableAudio = false, attachedFiles = [] } = props;

  return (
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
      <input
        type="file"
        ref={composer.videoInputRef}
        className="hidden"
        accept="video/mp4"
        onChange={composer.handleVideoChange}
        disabled={disabled || composer.hasAudio || attachedFiles.length > 0}
      />
    </>
  );
}
