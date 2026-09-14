import { Send, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecordingControls } from "./AudioRecordingControls";
import { AudioPreview } from "@/components/messaging/media/AudioPreview";
import { AttachmentMenu } from "@/components/messaging/media/AttachmentMenu";
import { MessageTextInput } from "./MessageTextInput";
import { t } from "@/infrastructure/i18n/translations";
import type { UseMessageComposerReturn } from "./useMessageComposer";
import type { MessageInputProps } from "./MessageInput";

interface MessageSendButtonProps {
  composer: UseMessageComposerReturn;
  disabled?: boolean;
  disableAudio?: boolean;
  hasContent: boolean;
}

function MessageSendButton({ composer, disabled, disableAudio, hasContent }: MessageSendButtonProps) {
  if (composer.canSendDirectly) {
    return (
      <Button
        variant="brand"
        type="button"
        onClick={composer.handleSend}
        disabled={disabled || composer.isRecording || !hasContent}
        aria-label={t.messaging.sendLabel}
        aria-busy={disabled}
        data-testid="message-send-button"
        className="h-11 w-11 rounded-full p-0 flex items-center justify-center font-semibold shrink-0 bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm active:scale-95 transition-all cursor-pointer"
      >
        {disabled ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" data-testid="sending-spinner" />
        ) : (
          <Send className="w-5 h-5" aria-hidden="true" />
        )}
      </Button>
    );
  }

  return (
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
  );
}

function MessageTextInputBar({
  props,
  composer,
  onSendText,
}: {
  props: MessageInputProps;
  composer: UseMessageComposerReturn;
  onSendText: () => void;
}) {
  const {
    value,
    onChange,
    disabled,
    attachedFiles = [],
    onAttachFiles,
    onOpenServiceProposal,
    disableAudio = false,
    disableVideo = false,
  } = props;

  return (
    <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm min-h-[44px]">
      {onAttachFiles && (
        <AttachmentMenu
          onAttachImages={() => composer.fileInputRef.current?.click()}
          onAttachAudio={() => composer.audioInputRef.current?.click()}
          onAttachVideo={() => composer.videoInputRef.current?.click()}
          onCreateProposal={onOpenServiceProposal}
          showProposalOption={!!onOpenServiceProposal}
          disabled={disabled || attachedFiles.length >= 5 || composer.hasAudio}
          audioDisabled={disableAudio}
          videoDisabled={disableVideo}
        />
      )}

      <MessageTextInput
        ref={composer.inputRef}
        value={value}
        onChange={onChange}
        onSend={onSendText}
        disabled={disabled || composer.hasAudio}
      />
    </div>
  );
}

interface MessageInputSlotProps {
  props: MessageInputProps;
  composer: UseMessageComposerReturn;
  onSendText: () => void;
}

function MessageInputSlot({ props, composer, onSendText }: MessageInputSlotProps) {
  if (composer.isRecording) {
    return (
      <AudioRecordingControls
        isPaused={composer.isPaused}
        elapsedSeconds={composer.elapsedSeconds}
        onCancel={composer.cancelRecording}
        onPause={composer.pauseRecording}
        onResume={composer.resumeRecording}
        onStop={composer.stopRecording}
      />
    );
  }

  if (composer.attachedAudio) {
    return (
      <AudioPreview
        audioUrl={composer.attachedAudio.url}
        fileName={composer.attachedAudio.file.name}
        onRemove={composer.removeAudio}
        onDurationLoaded={composer.handleAudioDurationLoaded}
      />
    );
  }

  if (composer.audioUrl) {
    return (
      <AudioPreview
        audioUrl={composer.audioUrl}
        fileName={t.messaging.audioRecorder.recordedFileName}
        onRemove={composer.cancelRecording}
        onDurationLoaded={composer.handleAudioDurationLoaded}
      />
    );
  }

  return <MessageTextInputBar props={props} composer={composer} onSendText={onSendText} />;
}

export interface MessageComposerControlsProps {
  props: MessageInputProps;
  composer: UseMessageComposerReturn;
  onSendText: () => void;
}

export function MessageComposerControls({
  props,
  composer,
  onSendText,
}: MessageComposerControlsProps) {
  const { value, attachedFiles = [], disabled, disableAudio = false } = props;
  const hasContent = !!value.trim() || attachedFiles.length > 0 || composer.hasAudio || composer.hasVideo;

  return (
    <>
      <MessageInputSlot props={props} composer={composer} onSendText={onSendText} />
      <MessageSendButton
        composer={composer}
        disabled={disabled}
        disableAudio={disableAudio}
        hasContent={hasContent}
      />
    </>
  );
}
