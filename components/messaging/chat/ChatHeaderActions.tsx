"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { Money } from "@/domain/shared/Money";
import type { JobRequestInfo, ServiceProposalSummary } from "@/domain/messaging/types";

export interface ChatHeaderActionsState {
  pending?: boolean;
  isProvider?: boolean;
  isLoadingJobRequest?: boolean;
}

export interface ChatHeaderActionHandlers {
  onAccept?: () => void;
  onViewJobRequest?: () => void;
  onOpenProposal?: () => void;
}

export interface ChatHeaderActionsProps {
  conversationState?: ChatHeaderActionsState;
  jobRequest?: JobRequestInfo | null;
  serviceProposal?: ServiceProposalSummary | null;
  actions?: ChatHeaderActionHandlers;
}

export function ChatHeaderActions({
  conversationState,
  jobRequest,
  serviceProposal,
  actions,
}: ChatHeaderActionsProps) {
  const pending = conversationState?.pending ?? false;
  const isProvider = conversationState?.isProvider ?? false;
  const isLoadingJobRequest = conversationState?.isLoadingJobRequest ?? false;
  const onAccept = actions?.onAccept;
  const onViewJobRequest = actions?.onViewJobRequest;
  const onOpenProposal = actions?.onOpenProposal;
  return (
    <>
      {serviceProposal && serviceProposal.status === "pending" && onOpenProposal && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenProposal}
          className="h-8 px-2.5 sm:px-3 text-xs font-semibold border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100/90 hover:border-amber-400 cursor-pointer shadow-2xs gap-1.5 shrink-0"
          aria-label="Ver propuesta de servicio pendiente"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="hidden sm:inline">
            {isProvider
              ? t.messaging.serviceProposal.headerPendingProviderChip
              : t.messaging.serviceProposal.headerPendingChip}
          </span>
          <span className="font-bold">{Money.format(Money.create(serviceProposal.amountCents))}</span>
        </Button>
      )}

      {isLoadingJobRequest ? (
        <Button
          variant="brandSecondary"
          disabled
          className="animate-pulse opacity-70"
        >
          {t.messaging.viewJobRequest}
        </Button>
      ) : (
        <>
          {jobRequest && (
            <Button
              variant="brandSecondary"
              onClick={onViewJobRequest}
              aria-label={t.messaging.viewJobRequestLabel}
            >
              {t.messaging.viewJobRequest}
            </Button>
          )}

          {pending && onAccept && (
            <Button
              variant="brandSecondary"
              onClick={onAccept}
            >
              {t.messaging.viewJobRequest}
            </Button>
          )}
        </>
      )}
    </>
  );
}

export default ChatHeaderActions;
