import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { ROUTES } from "@/lib/routes";
import {
  getConversationDetail,
  acceptJobRequest,
  getJobRequestForConversation,
  createConversation,
  sendMessage,
  sendAudioMessage as sendAudioMessageAction,
  sendVideoMessage as sendVideoMessageAction,
  getServiceProposalsAction,
} from "@/app/prestador/mensajes/actions";
import type { ProviderWorkRequest } from "@/domain/provider/types";
import type {
  ConversationDetailInfo,
  ProviderConversationContact as ConversationContact,
} from "@/domain/messaging/types";
import { clientFileUploadRepository } from "@/app/files/client-file-upload";
import { ClientConversationCommandRepository } from "@/infrastructure/repositories/messaging/client-conversation-command-repository";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/shared/local-offline-queue-repository";
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

interface ProviderMessageJobRequest {
  id: number;
  title: string;
  description: string;
  consumerName: string;
  images?: { id: string; url: string; originalName: string }[];
}

function mapProviderJobRequest(
  jobRequest: NonNullable<Awaited<ReturnType<typeof getJobRequestForConversation>>>,
  conversation: ConversationDetailInfo
): ProviderMessageJobRequest {
  return {
    id: jobRequest.id,
    title: jobRequest.title,
    description: jobRequest.description,
    consumerName: `${conversation.counterpart.name} ${conversation.counterpart.surname}`,
    images: jobRequest.images,
  };
}

export function useProviderMessages(
  session: AuthSession | null,
  contacts: ConversationContact[],
  myUserId: string
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlConsumerId = searchParams.get("consumer_id");
  const selectedConsumerId =
    urlConsumerId ?? (contacts.length > 0 ? contacts[0].consumerId : null);

  const [acceptedConversations, setAcceptedConversations] = useState<Set<string>>(new Set());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showServiceProposalModal, setShowServiceProposalModal] = useState(false);
  const relatedData = useConversationRelatedData({
    selectedCounterpartId: selectedConsumerId,
    getJobRequest: getJobRequestForConversation,
    getServiceProposals: getServiceProposalsAction,
    mapJobRequest: mapProviderJobRequest,
  });
  const {
    activeJobRequest,
    activeServiceProposal,
    clearActiveJobRequest,
  } = relatedData;

  const core = useMessagingCore<ConversationContact>({
    session,
    myUserId,
    myRole: "provider",
    selectedCounterpartId: selectedConsumerId,
    contacts,
    getCounterpartIdFromContact: (c) => c.consumerId,
    getConversationDetail,
    conversationRepository,
    fileRepository,
    offlineQueueRepository: offlineQueueRepo,
    onConversationLoaded: relatedData.onConversationLoaded,
  });

  const handleContactClick = (consumerId: string) => {
    router.push(`${ROUTES.provider.messages}?consumer_id=${consumerId}`);
  };

  const handleAccept = async () => {
    if (!activeJobRequest) return;
    try {
      await acceptJobRequest(activeJobRequest.id);
      if (core.selectedContact) {
        setAcceptedConversations((prev) => new Set([...prev, core.selectedContact!.id]));
      }
      clearActiveJobRequest();
      setShowRequestModal(false);
    } catch (error) {
      console.error("Error accepting job request:", error);
    }
  };

  const handleReject = async () => {
    setShowRequestModal(false);
  };

  const modalRequest: ProviderWorkRequest | null = activeJobRequest
    ? {
        id: String(activeJobRequest.id),
        conversationId: core.effectiveConversationId ?? "",
        clientName: activeJobRequest.consumerName,
        problemTitle: activeJobRequest.title,
        category: "",
        description: activeJobRequest.description,
        location: "",
        publishedAtLabel: "",
        unreadMessagesCount: 0,
        images: activeJobRequest.images,
      }
    : null;

  const isPending = (c: ConversationContact) => c.pending && !acceptedConversations.has(c.id);
  const contactsWithUnread = core.localContacts.map((c) => ({
    ...c,
    pending: isPending(c),
  }));

  const handleServiceProposalSuccess = () => {
    setShowServiceProposalModal(false);
  };

  return {
    selectedConsumerId,
    selectedContact: core.selectedContact,
    contactsWithUnread,
    viewMessages: core.viewMessages,
    messageInput: core.messageInput,
    setMessageInput: core.setMessageInput,
    isSending: core.isSending,
    attachedFiles: core.attachedFiles,
    setAttachedFiles: core.setAttachedFiles,
    expandedMessages: core.expandedMessages,
    toggleMessageExpanded: core.toggleMessageExpanded,
    messagesEndRef: core.messagesEndRef,
    handleSendMessage: core.handleSendMessage,
    handleSendAudio: core.handleSendAudio,
    handleSendVideo: core.handleSendVideo,
    handleContactClick,
    handleAccept,
    handleReject,
    activeJobRequest,
    activeServiceProposal,
    relatedDataError: relatedData.relatedDataError,
    retryRelatedData: relatedData.retryRelatedData,
    showRequestModal,
    setShowRequestModal,
    modalRequest,
    isPending,
    showServiceProposalModal,
    setShowServiceProposalModal,
    handleServiceProposalSuccess,
  };
}
