"use client";

import React from "react";
import type { ServiceProposalSummary } from "@/domain/messaging/types";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

export interface ProposalTimelineActionsProps {
  proposal: ServiceProposalSummary;
  isProvider: boolean;
  onClick: () => void;
  className?: string;
}

export function ProposalTimelineActions({
  proposal,
  isProvider,
  onClick,
  className,
}: ProposalTimelineActionsProps) {
  const getButtonContent = () => {
    if (proposal.status === "pending") {
      return isProvider
        ? t.messaging.serviceProposal.viewSentCTA
        : t.messaging.serviceProposal.reviewAndPayCTA;
    }
    if (proposal.status === "accepted") {
      return t.messaging.serviceProposal.viewAcceptedCTA;
    }
    return t.messaging.serviceProposal.viewRejectedCTA;
  };

  const getButtonVariant = () => {
    if (proposal.status === "pending" && !isProvider) {
      return "brand" as const;
    }
    return "outline" as const;
  };

  return (
    <Button
      type="button"
      variant={getButtonVariant()}
      size="action"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full h-10 py-2 text-body font-semibold rounded-xl cursor-pointer shadow-2xs gap-1.5",
        proposal.status === "pending" && !isProvider
          ? "bg-brand-primary text-white hover:bg-brand-primary/90"
          : "hover:bg-slate-50",
        className,
      )}
    >
      <span>{getButtonContent()}</span>
      <ArrowRight className="w-4 h-4 shrink-0" />
    </Button>
  );
}

export default ProposalTimelineActions;
