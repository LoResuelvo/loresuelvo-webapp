import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { ConversationDetailInfo, ServiceProposalSummary } from "@/domain/messaging/types";
import { useResourceUpdate } from "@/infrastructure/notifications/NotificationContext";

interface UseConversationRelatedDataOptions<TRequest, TActiveRequest> {
  selectedCounterpartId: string | null;
  getJobRequest: (conversationId: string) => Promise<TRequest | null>;
  getServiceProposals: () => Promise<ServiceProposalSummary[]>;
  mapJobRequest: (request: TRequest, conversation: ConversationDetailInfo) => TActiveRequest;
}

interface LoadedConversation {
  conversationId: string;
  counterpartId: string;
  detail: ConversationDetailInfo;
}

interface RequestGenerations {
  selection: number;
  jobRequest: number;
  proposal: number;
}

interface LoadConversationDataOptions<TRequest, TActiveRequest> {
  selectedCounterpartIdRef: MutableRefObject<string | null>;
  loadedConversationRef: MutableRefObject<LoadedConversation | null>;
  requestGenerationsRef: MutableRefObject<RequestGenerations>;
  isMountedRef: MutableRefObject<boolean>;
  setActiveJobRequest: Dispatch<SetStateAction<TActiveRequest | null | undefined>>;
  setActiveServiceProposal: Dispatch<SetStateAction<ServiceProposalSummary | null>>;
  setJobRequestError: Dispatch<SetStateAction<boolean>>;
  setProposalError: Dispatch<SetStateAction<boolean>>;
  getJobRequest: (conversationId: string) => Promise<TRequest | null>;
  getServiceProposals: () => Promise<ServiceProposalSummary[]>;
  mapJobRequest: (request: TRequest, conversation: ConversationDetailInfo) => TActiveRequest;
}

function applyCurrentRequest<T>(
  request: Promise<T>,
  isCurrent: () => boolean,
  onSuccess: (result: T) => void,
  onError: () => void
) {
  void request
    .then((result) => {
      if (isCurrent()) onSuccess(result);
    })
    .catch(() => {
      if (isCurrent()) onError();
    });
}

function loadConversationData<TRequest, TActiveRequest>(
  options: LoadConversationDataOptions<TRequest, TActiveRequest>,
  conversationId: string,
  detail: ConversationDetailInfo,
  preserveCurrent: boolean
) {
  const {
    selectedCounterpartIdRef,
    loadedConversationRef,
    requestGenerationsRef,
    isMountedRef,
    setActiveJobRequest,
    setActiveServiceProposal,
    setJobRequestError,
    setProposalError,
    getJobRequest,
    getServiceProposals,
    mapJobRequest,
  } = options;
  const counterpartId = String(detail.counterpart.id);
  if (!isMountedRef.current || counterpartId !== selectedCounterpartIdRef.current) return;

  loadedConversationRef.current = { conversationId, counterpartId, detail };
  const selectionGeneration = requestGenerationsRef.current.selection;
  const jobRequestGeneration = ++requestGenerationsRef.current.jobRequest;
  const proposalGeneration = ++requestGenerationsRef.current.proposal;
  const isCurrentConversation = () =>
    isMountedRef.current &&
    selectionGeneration === requestGenerationsRef.current.selection &&
    loadedConversationRef.current?.conversationId === conversationId &&
    counterpartId === selectedCounterpartIdRef.current;

  if (!preserveCurrent) {
    setActiveJobRequest(undefined);
    setActiveServiceProposal(null);
  }
  setJobRequestError(false);
  setProposalError(false);

  applyCurrentRequest(
    getJobRequest(conversationId),
    () => isCurrentConversation() && jobRequestGeneration === requestGenerationsRef.current.jobRequest,
    (request) => {
      setActiveJobRequest(request ? mapJobRequest(request, detail) : null);
      setJobRequestError(false);
    },
    () => {
      setActiveJobRequest((current) => current === undefined ? null : current);
      setJobRequestError(true);
    }
  );
  applyCurrentRequest(
    getServiceProposals(),
    () => isCurrentConversation() && proposalGeneration === requestGenerationsRef.current.proposal,
    (proposals) => {
      const proposal = proposals.find((item) => item.conversationId === Number(conversationId));
      setActiveServiceProposal(proposal ?? null);
      setProposalError(false);
    },
    () => setProposalError(true)
  );
}

export function useConversationRelatedData<TRequest, TActiveRequest>({
  selectedCounterpartId,
  getJobRequest,
  getServiceProposals,
  mapJobRequest,
}: UseConversationRelatedDataOptions<TRequest, TActiveRequest>) {
  const [activeJobRequest, setActiveJobRequest] = useState<TActiveRequest | null | undefined>(undefined);
  const [activeServiceProposal, setActiveServiceProposal] = useState<ServiceProposalSummary | null>(null);
  const [jobRequestError, setJobRequestError] = useState(false);
  const [proposalError, setProposalError] = useState(false);
  const selectedCounterpartIdRef = useRef(selectedCounterpartId);
  selectedCounterpartIdRef.current = selectedCounterpartId;
  const loadedConversationRef = useRef<LoadedConversation | null>(null);
  const requestGenerationsRef = useRef<RequestGenerations>({ selection: 0, jobRequest: 0, proposal: 0 });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestGenerationsRef.current.selection += 1;
      requestGenerationsRef.current.jobRequest += 1;
      requestGenerationsRef.current.proposal += 1;
    };
  }, []);

  useEffect(() => {
    requestGenerationsRef.current.selection += 1;
    requestGenerationsRef.current.jobRequest += 1;
    requestGenerationsRef.current.proposal += 1;
    loadedConversationRef.current = null;
    setActiveJobRequest(undefined);
    setActiveServiceProposal(null);
    setJobRequestError(false);
    setProposalError(false);
  }, [selectedCounterpartId]);

  const loadRelatedData = useCallback((
    conversationId: string,
    detail: ConversationDetailInfo,
    preserveCurrent = false
  ) => {
    loadConversationData({
      selectedCounterpartIdRef,
      loadedConversationRef,
      requestGenerationsRef,
      isMountedRef,
      setActiveJobRequest,
      setActiveServiceProposal,
      setJobRequestError,
      setProposalError,
      getJobRequest,
      getServiceProposals,
      mapJobRequest,
    }, conversationId, detail, preserveCurrent);
  }, [getJobRequest, getServiceProposals, mapJobRequest]);

  const refreshActiveProposal = useCallback(async () => {
    const loadedConversation = loadedConversationRef.current;
    if (!loadedConversation || loadedConversation.counterpartId !== selectedCounterpartIdRef.current) return;
    const selectionGeneration = requestGenerationsRef.current.selection;
    const proposalGeneration = ++requestGenerationsRef.current.proposal;

    try {
      const proposals = await getServiceProposals();
      if (
        !isMountedRef.current ||
        selectionGeneration !== requestGenerationsRef.current.selection ||
        proposalGeneration !== requestGenerationsRef.current.proposal ||
        loadedConversationRef.current?.conversationId !== loadedConversation.conversationId
      ) return;
      const proposal = proposals.find((item) => item.conversationId === Number(loadedConversation.conversationId));
      setActiveServiceProposal(proposal ?? null);
      setProposalError(false);
    } catch {
      if (
        !isMountedRef.current ||
        selectionGeneration !== requestGenerationsRef.current.selection ||
        proposalGeneration !== requestGenerationsRef.current.proposal ||
        loadedConversationRef.current?.conversationId !== loadedConversation.conversationId
      ) return;
      setProposalError(true);
    }
  }, [getServiceProposals]);

  const retryRelatedData = useCallback(() => {
    const loadedConversation = loadedConversationRef.current;
    if (loadedConversation) {
      loadRelatedData(loadedConversation.conversationId, loadedConversation.detail, true);
    }
  }, [loadRelatedData]);

  const clearActiveJobRequest = useCallback(() => {
    setActiveJobRequest(null);
    setJobRequestError(false);
  }, []);

  useResourceUpdate("service_proposal", undefined, refreshActiveProposal);

  return {
    activeJobRequest,
    activeServiceProposal,
    relatedDataError: jobRequestError || proposalError,
    retryRelatedData,
    clearActiveJobRequest,
    onConversationLoaded: loadRelatedData,
  };
}
