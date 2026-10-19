import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import {
  getConversationDetail,
  getJobRequestForConversation,
  createConversation,
  sendMessage,
  sendAudioMessage as sendAudioMessageAction,
  sendVideoMessage as sendVideoMessageAction,
  getServiceProposalsAction,
} from "@/app/consumidor/mensajes/actions";
import type {
  JobRequestInfo,
  ConversationDetailInfo,
  ConsumerConversationContact as ConversationContact,
} from "@/domain/messaging/types";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { ClientConversationCommandRepository } from "@/infrastructure/repositories/messaging/client-conversation-command-repository";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/shared/local-offline-queue-repository";
import type { MessageInputHandle } from "@/components/messaging/chat/MessageInput";
import { useConversationRelatedData } from "@/components/messaging/useConversationRelatedData";
import { useMessagingCore } from "@/hooks/messaging/useMessagingCore";

const conversationRepository = new ClientConversationCommandRepository({
  create: createConversation,
  sendMessage,
  sendAudioMessage: sendAudioMessageAction,
  sendVideoMessage: sendVideoMessageAction,
});
const fileRepository = clientFileUploadRepository;
const offlineQueueRepo = new LocalOfflineQueueRepository();

function mapConsumerJobRequest(
  jobRequest: NonNullable<Awaited<ReturnType<typeof getJobRequestForConversation>>>,
  conversation: ConversationDetailInfo
): JobRequestInfo {
  return {
    title: jobRequest.title,
    description: jobRequest.description,
    providerName: conversation.counterpart.name,
    providerSurname: conversation.counterpart.surname,
    providerProfilePhotoUrl: conversation.counterpart.profilePhotoUrl,
    images: jobRequest.images,
  };
}

export function useConsumerMessages(
  session: AuthSession | null,
  contacts: ConversationContact[],
  myUserId: string
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProviderId = searchParams.get("provider_id");
  const selectedProviderId =
    urlProviderId ?? (contacts.length > 0 ? contacts[0].providerId : null);

  const [isConversationPending, setIsConversationPending] = useState<boolean>(false);
  const inputRef = useRef<MessageInputHandle>(null);

  const selectedContact = contacts.find((c) => c.providerId === selectedProviderId);

  const relatedData = useConversationRelatedData({
    selectedCounterpartId: selectedProviderId,
    getJobRequest: getJobRequestForConversation,
    getServiceProposals: getServiceProposalsAction,
    mapJobRequest: mapConsumerJobRequest,
  });

  useEffect(() => {
    setIsConversationPending(selectedContact?.pending ?? false);
  }, [selectedContact?.id, selectedContact?.pending]);

  const core = useMessagingCore<ConversationContact>({
    session,
    myUserId,
    myRole: "consumer",
    selectedCounterpartId: selectedProviderId,
    contacts,
    getCounterpartIdFromContact: (c) => c.providerId,
    getConversationDetail,
    conversationRepository,
    fileRepository,
    offlineQueueRepository: offlineQueueRepo,
    onNewIncomingMessage: () => {
      setIsConversationPending(false);
    },
    onConversationLoaded: relatedData.onConversationLoaded,
  });

  const handleContactClick = (providerId: string) => {
    router.push(`${ROUTES.consumer.messages}?provider_id=${providerId}`);
  };

  const contactsWithUnread = core.localContacts.map((c) => ({
    ...c,
    pending: c.providerId === selectedProviderId ? isConversationPending : c.pending,
  }));

  return {
    messageInput: core.messageInput,
    setMessageInput: core.setMessageInput,
    attachedFiles: core.attachedFiles,
    setAttachedFiles: core.setAttachedFiles,
    isSending: core.isSending,
    expandedMessages: core.expandedMessages,
    messagesEndRef: core.messagesEndRef,
    inputRef,
    activeJobRequest: relatedData.activeJobRequest,
    activeServiceProposal: relatedData.activeServiceProposal,
    relatedDataError: relatedData.relatedDataError,
    retryRelatedData: relatedData.retryRelatedData,
    isConversationPending,
    selectedContact: core.selectedContact,
    selectedProviderId,
    toggleMessageExpanded: core.toggleMessageExpanded,
    handleSendMessage: core.handleSendMessage,
    handleSendAudio: core.handleSendAudio,
    handleSendVideo: core.handleSendVideo,
    handleContactClick,
    viewMessages: core.viewMessages,
    contactsWithUnread,
  };
}
