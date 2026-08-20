"use client";

import React from "react";
import type { ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents, formatProposalTime, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowRight } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface ProposalTimelineCardProps {
  proposal: ServiceProposalSummary;
  isProvider: boolean;
  onClick: () => void;
  className?: string;
}

export function ProposalTimelineCard({
  proposal,
  isProvider,
  onClick,
  className,
}: ProposalTimelineCardProps) {
  const statusBadge = getStatusBadge(proposal.status);

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
    <div
      data-testid="service-proposal-panel"
      data-proposal-id={proposal.id}
      className={cn(
        "w-full flex my-2",
        isProvider ? "justify-end" : "justify-start",
        className,
      )}
    >
      <div
        onClick={onClick}
        className={cn(
          "w-full max-w-sm sm:max-w-md bg-white border border-slate-200 p-4 shadow-sm space-y-3 transition-shadow hover:shadow-md cursor-pointer",
          isProvider ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide truncate">
              {t.serviceProposals.chatPanel.title}
            </span>
          </div>
          <Badge variant={statusBadge.variant} className="px-2 py-0.5 font-medium shrink-0">
            {statusBadge.label}
          </Badge>
        </div>

        {/* Content Details */}
        <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-150/60 space-y-2.5">
          <div className="flex flex-col">
            <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
              Monto
            </span>
            <span className="text-subtitle font-bold text-slate-900 leading-tight">
              {formatAmountCents(proposal.amountCents)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-200/60">
            <span className="text-caption text-slate-400 font-medium">
              Fecha y hora
            </span>
            <div className="flex items-center gap-2 text-slate-600 text-small font-medium">
              <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">{formatScheduledOn(proposal.scheduledOn)}</span>
            </div>
          </div>

          {proposal.description && (
            <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-200/60">
              <span className="text-caption text-slate-400 font-medium">
                Descripción
              </span>
              <p
                className="text-small text-slate-600 line-clamp-2 leading-relaxed break-words"
                title={proposal.description}
              >
                {proposal.description}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
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
          )}
        >
          <span>{getButtonContent()}</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Button>

        {/* Timestamp */}
        {proposal.createdOn && (
          <p className="text-caption text-slate-400 text-right pt-0.5">
            {formatProposalTime(proposal.createdOn)}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProposalTimelineCard;
