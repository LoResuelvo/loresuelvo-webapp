import { useRef } from "react";
import { sendMessageWithAttachments } from "@/application/messaging/send-message-with-attachments";
import { AudioUploadError, sendAudioMessage, type AudioUploadFailureStage } from "@/application/messaging/send-audio-message";
import type { Message } from "@/domain/messaging/types";
import type { FileRepository } from "@/ports/files/file-repository";
import type { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import type { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import { t } from "@/infrastructure/i18n/translations";
import type { AuthSession } from "@/infrastructure/auth/types";

interface UseMessageOutboxConfig {
  session: AuthSession | null;
  myUserId: string;
  myRole: "consumer" | "provider";
  selectedCounterpartId: string | null;
  currentConversationId: string | undefined;
  effectiveConversationId: string | undefined;
  messageInput: string;
  attachedFiles: File[];
  isSending: boolean;
  setMessageInput: (value: string) => void;
  setAttachedFiles: (files: File[]) => void;
  setIsSending: (isSending: boolean) => void;
  setActiveConversationId: (conversationId: string) => void;
  conversationRepository: ConversationCommandRepository;
  fileRepository: FileRepository;
  offlineQueueRepository: OfflineQueueRepository;
  now: () => Date;
  addLocalMessage: (message: Message) => void;
  removeLocalMessage: (messageId: string) => void;
  replaceLocalMessage: (optimisticMessageId: string, message: Message) => void;
  addLoadedMessage: (message: Message) => void;
  updateContactPreview: (lastMessage: string) => void;
  preserveDraftForSubmission: (text: string, files: File[]) => void;
  discardConversationDraft: (conversationId: string) => void;
  markConversationJustCreated: () => void;
}

function getSenderId(session: AuthSession | null, myUserId: string): string {
  return session?.user?.id ?? myUserId;
}

function formatTextPreview(content: string): string {
  return content.length > 40 ? `${content.slice(0, 40)}…` : content;
}

function createOptimisticTextMessage(
  id: string,
  content: string | undefined,
  files: File[],
  senderId: string,
  createdOn: string
): Message {
  return {
    id,
    content,
    senderId,
    sentAt: "Ahora",
    createdOn,
    images: files.map((file) => ({
      id: `temp-img-${Math.random()}`,
      url: URL.createObjectURL(file),
      originalName: file.name,
    })),
  };
}

function createOptimisticAudioMessage(id: string, file: File, senderId: string, createdOn: string, url: string): Message {
  return {
    id,
    senderId,
    sentAt: "Ahora",
    createdOn,
    audio: {
      id,
      url,
      originalName: file.name,
      durationSeconds: 0,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  };
}

/**
 * Text and audio are separate, readable delivery workflows, but share one concurrency lock,
 * optimistic lifecycle, and contact preview contract. Keeping them together prevents those
 * delivery rules from being duplicated across two hooks.
 */
export function useMessageOutbox(config: UseMessageOutboxConfig) {
  const sendingRef = useRef(false);

  const beginSending = (): boolean => {
    if (config.isSending || sendingRef.current) return false;
    sendingRef.current = true;
    config.setIsSending(true);
    return true;
  };

  const finishSending = () => {
    config.setIsSending(false);
    sendingRef.current = false;
  };

  const handleSendMessage = async () => {
    if ((!config.messageInput.trim() && config.attachedFiles.length === 0) || !config.selectedCounterpartId) return;
    if (!beginSending()) return;

    const content = config.messageInput.trim() || undefined;
    const files = [...config.attachedFiles];
    const optimisticMessage = createOptimisticTextMessage(
      `local-${config.now().getTime()}`,
      content,
      files,
      getSenderId(config.session, config.myUserId),
      config.now().toISOString()
    );
    config.addLocalMessage(optimisticMessage);
    config.updateContactPreview(content ? formatTextPreview(content) : `📷 ${t.messaging.attachedImage}`);
    config.preserveDraftForSubmission(config.messageInput, files);
    config.setMessageInput("");
    config.setAttachedFiles([]);

    try {
      const result = await sendMessageWithAttachments(config.conversationRepository, config.fileRepository, {
        conversationId: config.currentConversationId ?? null,
        counterpartId: parseInt(config.selectedCounterpartId),
        myUserId: getSenderId(config.session, config.myUserId),
        myRole: config.myRole,
        content,
        files,
      });
      if (result.conversationId !== config.currentConversationId) {
        config.setActiveConversationId(result.conversationId);
        config.markConversationJustCreated();
      }
      config.removeLocalMessage(optimisticMessage.id);
      config.addLoadedMessage(result.message);
      config.discardConversationDraft(config.currentConversationId ?? config.effectiveConversationId ?? "");
    } catch (error) {
      console.error("Error sending message:", error);
      const pendingMessage = { ...optimisticMessage, id: `pending-${optimisticMessage.id}` };
      config.removeLocalMessage(optimisticMessage.id);
      config.addLoadedMessage(pendingMessage);
      const queueId = config.currentConversationId || "new";
      const pending = config.offlineQueueRepository.loadPendingMessages(queueId);
      config.offlineQueueRepository.savePendingMessages(queueId, [...pending, pendingMessage]);
    } finally {
      finishSending();
    }
  };

  const handleSendAudio = async (file: File): Promise<boolean | AudioUploadFailureStage> => {
    if (!config.selectedCounterpartId || !config.currentConversationId || !/^\d+$/.test(config.currentConversationId)) return false;
    if (!beginSending()) return false;

    const id = `local-audio-${config.now().getTime()}`;
    const optimisticUrl = URL.createObjectURL(file);
    const optimisticMessage = createOptimisticAudioMessage(
      id,
      file,
      getSenderId(config.session, config.myUserId),
      config.now().toISOString(),
      optimisticUrl
    );
    config.addLocalMessage(optimisticMessage);
    config.updateContactPreview("🎤 Audio");

    try {
      const { message } = await sendAudioMessage(config.conversationRepository, config.fileRepository, {
        conversationId: config.currentConversationId,
        counterpartId: Number(config.selectedCounterpartId),
        myUserId: getSenderId(config.session, config.myUserId),
        myRole: config.myRole,
        file,
      });
      config.replaceLocalMessage(id, message);
      URL.revokeObjectURL(optimisticUrl);
      return true;
    } catch (error) {
      console.error("Error sending audio message:", error);
      config.removeLocalMessage(id);
      URL.revokeObjectURL(optimisticUrl);
      return error instanceof AudioUploadError ? error.stage : "send";
    } finally {
      finishSending();
    }
  };

  return { handleSendMessage, handleSendAudio };
}
