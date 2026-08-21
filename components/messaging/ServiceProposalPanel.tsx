"use client";

import React, { useState } from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { ServiceProposal } from "@/domain/messaging/ServiceProposal";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText, ChevronRight } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import ServiceProposalDetailModal from "./ServiceProposalDetailModal";

interface ServiceProposalPanelProps {
  proposal: ServiceProposalSummary;
}

export function ServiceProposalPanel({ proposal }: ServiceProposalPanelProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const statusBadge = ServiceProposal.getStatusBadge(proposal.status);

  return (
    <>
      <button
        type="button"
        data-testid="service-proposal-panel"
        onClick={() => setShowDetailModal(true)}
        aria-label={t.serviceProposals.chatPanel.viewDetails}
        className="w-full bg-white border-b border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50 cursor-pointer text-left group"
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-caption font-semibold uppercase tracking-wider text-slate-400">
              {t.serviceProposals.chatPanel.title}
            </span>
            <Badge variant={statusBadge.variant} className="text-caption px-2 py-0.5">
              {statusBadge.label}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-1">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-primary shrink-0" />
              <div className="flex flex-col">
                <span className="text-caption text-slate-400 font-medium">
                  {t.serviceProposals.chatPanel.amountLabel}
                </span>
                <span className="text-body font-semibold text-slate-700">
                  {Money.format(Money.create(proposal.amountCents))}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
              <div className="flex flex-col">
                <span className="text-caption text-slate-400 font-medium">
                  {t.serviceProposals.chatPanel.dateLabel}
                </span>
                <span className="text-body font-medium text-slate-700">
                  {ScheduledDateTime.formatWithTime(ScheduledDateTime.create(proposal.scheduledOn))}
                </span>
              </div>
            </div>

            {proposal.description && (
              <div className="flex items-start gap-2 col-span-1 md:col-span-1">
                <FileText className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div className="flex flex-col min-w-0">
                  <span className="text-caption text-slate-400 font-medium">
                    {t.serviceProposals.chatPanel.descriptionLabel}
                  </span>
                  <p className="text-body text-slate-600 line-clamp-1">
                    {proposal.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block group-hover:text-slate-500 transition-colors" />
      </button>

      {showDetailModal && (
        <ServiceProposalDetailModal
          proposal={proposal}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </>
  );
}
export default ServiceProposalPanel;
