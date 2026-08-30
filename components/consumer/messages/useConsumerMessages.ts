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
  getServiceProposalsAction,
} from "@/app/consumidor/mensajes/actions";
import {
  JobRequestInfo,
  ConsumerConversationContact as ConversationContact,
  ServiceProposalSummary,
} from "@/domain/messaging/types";
import {
  ClientConversationRepository,
  ClientFileRepository,
} from "@/infrastructure/repositories/shared/client-repositories";
import { LocalOfflineQueueRepository } from "@/infrastructure/repositories/shared/local-offline-queue-repository";
import type { MessageInputHandle } from "@/components/messaging/chat/MessageInput";
import { useMessagingCore } from "@/hooks/useMessagingCore";

const conversationRepository = new ClientConversationRepository({
  create: createConversation,
  sendMessage,
  sendAudioMessage: sendAudioMessageAction,
});
const fileRepository = new ClientFileRepository();
const offlineQueueRepo = new LocalOfflineQueueRepository();

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

  const [activeJobRequest, setActiveJobRequest] = useState<JobRequestInfo | null | undefined>(
    undefined
  );
  const [activeServiceProposal, setActiveServiceProposal] = useState<ServiceProposalSummary | null>(
    null
  );
  const [isConversationPending, setIsConversationPending] = useState<boolean>(false);
  const inputRef = useRef<MessageInputHandle>(null);

  const selectedContact = contacts.find((c) => c.providerId === selectedProviderId);

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
    onConversationLoaded: (effectiveConvId, data) => {
      setActiveJobRequest(undefined);
      getJobRequestForConversation(effectiveConvId)
        .then((jr) =>
          setActiveJobRequest(
            jr
              ? {
                  title: jr.title,
                  description: jr.description,
                  providerName: data.counterpart.name,
                  providerSurname: data.counterpart.surname,
                  providerProfilePhotoUrl: data.counterpart.profilePhotoUrl,
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
    activeJobRequest,
    activeServiceProposal,
    isConversationPending,
    selectedContact: core.selectedContact,
    selectedProviderId,
    toggleMessageExpanded: core.toggleMessageExpanded,
    handleSendMessage: core.handleSendMessage,
    handleSendAudio: core.handleSendAudio,
    handleContactClick,
    viewMessages: core.viewMessages,
    contactsWithUnread,
  };
}
