import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AuthSession } from "@/infrastructure/auth/types";
import type { ConversationDetailInfo, Message } from "@/domain/messaging/types";
import type { ConversationCommandRepository } from "@/ports/messaging/conversation-command-repository";
import type { FileUploadRepository } from "@/ports/files/file-upload-repository";
import type { OfflineQueueRepository } from "@/ports/shared/offline-queue-repository";
import type { AudioUploadFailureStage } from "@/application/messaging/send-audio-message";

export interface BaseConversationContact {
  id: string;
  lastMessage?: string;
  lastMessageAt?: string;
  pending?: boolean;
}

export interface UseMessagingCoreConfig<TContact extends BaseConversationContact> {
  session: AuthSession | null;
  myUserId: string;
  myRole: "consumer" | "provider";
  selectedCounterpartId: string | null;
  contacts: TContact[];
  getCounterpartIdFromContact: (contact: TContact) => string;
  getConversationDetail: (id: string) => Promise<ConversationDetailInfo>;
  conversationRepository: ConversationCommandRepository;
  fileRepository: FileUploadRepository;
  offlineQueueRepository: OfflineQueueRepository;
  onConversationLoaded?: (conversationId: string, data: ConversationDetailInfo) => void;
  onNewIncomingMessage?: (message: Message) => void;
}

export interface UseMessagingCoreReturn<TContact extends BaseConversationContact> {
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  attachedFiles: File[];
  setAttachedFiles: Dispatch<SetStateAction<File[]>>;
  isSending: boolean;
  expandedMessages: Set<string>;
  toggleMessageExpanded: (messageId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  viewMessages: Message[];
  localContacts: TContact[];
  setLocalContacts: Dispatch<SetStateAction<TContact[]>>;
  selectedContact: TContact | undefined;
  effectiveConversationId: string | undefined;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  handleSendMessage: () => Promise<void>;
  handleSendAudio: (file: File) => Promise<boolean | AudioUploadFailureStage>;
}
