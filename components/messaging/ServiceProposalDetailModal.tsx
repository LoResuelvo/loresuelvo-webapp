"use client";

import { ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents, formatScheduledOn, getStatusBadge } from "@/lib/proposal-utils";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";
import { getInitials } from "@/lib/text-utils";

interface ServiceProposalDetailModalProps {
  proposal: ServiceProposalSummary;
  onClose: () => void;
}

export default function ServiceProposalDetailModal({ proposal, onClose }: ServiceProposalDetailModalProps) {
  const { counterpart } = proposal;
  const displayName = `${counterpart.name} ${counterpart.surname}`.trim() || "Usuario";
  const initials = getInitials(displayName);
  const statusBadge = getStatusBadge(proposal.status);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t.serviceProposals.chatPanel.title}
      closeLabel={t.serviceProposals.chatPanel.closeLabel}
    >
      <div className="p-6 space-y-5" data-testid="service-proposal-detail-modal">
        {/* Counterpart info */}
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
          <Avatar
            src={counterpart.profilePhotoUrl}
            initials={initials}
            alt={`${t.messaging.photoAlt} ${displayName}`}
            size="lg"
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[18px] font-semibold text-slate-800">{displayName}</p>
            {counterpart.categoryName && (
              <p className="text-[14px] text-slate-500 mt-1">{counterpart.categoryName}</p>
            )}
          </div>
          <Badge variant={statusBadge.variant} className="shrink-0 mt-1">
            {statusBadge.label}
          </Badge>
        </div>

        {/* Detail fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4">
              <DollarSign className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {t.serviceProposals.chatPanel.amountLabel}
                </span>
                <span className="text-base font-semibold text-slate-700">
                  {formatAmountCents(proposal.amountCents)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4">
              <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {t.serviceProposals.chatPanel.dateLabel}
                </span>
                <span className="text-base font-medium text-slate-700">
                  {formatScheduledOn(proposal.scheduledOn)}
                </span>
              </div>
            </div>
          </div>

          {proposal.description && (
            <div className="pt-2 space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                  {t.serviceProposals.chatPanel.descriptionLabel}
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap max-h-60 overflow-y-auto pr-2">
                {proposal.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
