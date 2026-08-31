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
  getServiceProposalsAction,
} from "@/app/prestador/mensajes/actions";
import type { ProviderWorkRequest } from "@/domain/provider/types";
import {
  ProviderConversationContact as ConversationContact,
  ServiceProposalSummary,
} from "@/domain/messaging/types";
import {
  ClientConversationRepository,
  ClientFileRepository,
} from "@/infrastructure/repositories/shared/client-repositories";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/shared/local-offline-queue-repository";
import { useMessagingCore } from "@/hooks/messaging/useMessagingCore";

const conversationRepository = new ClientConversationRepository({
  create: createConversation,
  sendMessage,
  sendAudioMessage: sendAudioMessageAction,
});
const fileRepository = new ClientFileRepository();
const offlineQueueRepo = new LocalOfflineQueueRepository();

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
  const [activeJobRequest, setActiveJobRequest] = useState<{
    id: number;
    title: string;
    description: string;
    consumerName: string;
    images?: { id: string; url: string; originalName: string }[];
  } | null | undefined>(undefined);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showServiceProposalModal, setShowServiceProposalModal] = useState(false);
  const [activeServiceProposal, setActiveServiceProposal] = useState<ServiceProposalSummary | null>(
    null
  );

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
    onConversationLoaded: (effectiveConvId, data) => {
      setActiveJobRequest(undefined);
      getJobRequestForConversation(effectiveConvId)
        .then((jr) =>
          setActiveJobRequest(
            jr
              ? {
                  id: jr.id,
                  title: jr.title,
                  description: jr.description,
                  consumerName: `${data.counterpart.name} ${data.counterpart.surname}`,
                  images: jr.images,
                }
              : null
          )
        )
        .catch(() => setActiveJobRequest(null));

      getServiceProposalsAction()
        .then((proposals) => {
          const prop = proposals.find((p) => p.conversationId === Number(effectiveConvId));
          setActiveServiceProposal(prop || null);
        })
        .catch(() => setActiveServiceProposal(null));
    },
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
      setActiveJobRequest(null);
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
    handleContactClick,
    handleAccept,
    handleReject,
    activeJobRequest,
    activeServiceProposal,
    showRequestModal,
    setShowRequestModal,
    modalRequest,
    isPending,
    showServiceProposalModal,
    setShowServiceProposalModal,
    handleServiceProposalSuccess,
  };
}
