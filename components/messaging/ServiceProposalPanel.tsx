import React from "react";
import { ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

interface ServiceProposalPanelProps {
  proposal: ServiceProposalSummary;
}

export function ServiceProposalPanel({ proposal }: ServiceProposalPanelProps) {
  const statusBadge = getStatusBadge(proposal.status);

  return (
    <div 
      data-testid="service-proposal-panel"
      className="bg-white border-b border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
    >
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.serviceProposals.chatPanel.title}
          </span>
          <Badge variant={statusBadge.variant} className="text-[10px] px-2 py-0.5">
            {statusBadge.label}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">
                {t.serviceProposals.chatPanel.amountLabel}
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {formatAmountCents(proposal.amountCents)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">
                {t.serviceProposals.chatPanel.dateLabel}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {formatScheduledOn(proposal.scheduledOn)}
              </span>
            </div>
          </div>

          {proposal.description && (
            <div className="flex items-start gap-2 col-span-1 md:col-span-1">
              <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">
                  {t.serviceProposals.chatPanel.descriptionLabel}
                </span>
                <p className="text-sm text-slate-600 line-clamp-1">
                  {proposal.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ServiceProposalPanel;
