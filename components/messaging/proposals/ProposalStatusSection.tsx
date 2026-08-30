import { ServiceProposalSummary } from "@/domain/messaging/types";
import { Money } from "@/domain/shared/Money";
import { ScheduledDateTime } from "@/domain/shared/ScheduledDateTime";
import { Duration } from "@/domain/shared/Duration";
import { ServiceProposal } from "@/domain/messaging/ServiceProposal";
import { Provider } from "@/domain/provider/Provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailField } from "@/components/ui/detail-field";
import { Calendar, DollarSign, FileText, MessageCircle, Clock } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

export interface ProposalStatusSectionProps {
  proposal: ServiceProposalSummary;
  onViewConversation?: (conversationId: number) => void;
}

export function ProposalStatusSection({
  proposal,
  onViewConversation,
}: ProposalStatusSectionProps) {
  const counterpart = proposal.counterpart;
  const displayName = Provider.getDisplayName(counterpart) || "Usuario";
  const initials = Provider.getInitials(counterpart);
  const statusBadge = ServiceProposal.getStatusBadge(proposal.status);
  const scheduledOnVo = ScheduledDateTime.create(proposal.scheduledOn);

  return (
    <>
      {/* Counterpart info */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            src={counterpart.profilePhotoUrl}
            initials={initials}
            alt={`${t.messaging.photoAlt} ${displayName}`}
            size="lg"
            className="ring-2 ring-slate-100 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-subtitle font-semibold text-slate-800 leading-tight">{displayName}</p>
              <Badge variant={statusBadge.variant} className="px-2 py-0.5 font-medium">
                {statusBadge.label}
              </Badge>
            </div>
            {counterpart.categoryName && (
              <p className="text-body-sm text-slate-500 mt-1 font-normal">{counterpart.categoryName}</p>
            )}
          </div>
        </div>

        {onViewConversation && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-small text-brand-primary h-8 px-3 font-medium cursor-pointer shadow-2xs hover:bg-slate-50 hover:text-brand-primary shrink-0"
            onClick={() => onViewConversation(proposal.conversationId)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {t.serviceProposals.viewConversation}
          </Button>
        )}
      </div>

      {/* Detail fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <DetailField
            icon={<DollarSign className="w-5 h-5" />}
            label={t.serviceProposals.chatPanel.amountLabel}
            value={Money.format(Money.create(proposal.amountCents))}
            variant="highlight"
          />

          <DetailField
            icon={<Calendar className="w-5 h-5" />}
            label={t.serviceProposals.chatPanel.dateLabel}
            value={ScheduledDateTime.formatWithTime(scheduledOnVo)}
            variant="default"
          />

          {proposal.estimatedDurationMinutes && (
            <DetailField
              icon={<Clock className="w-5 h-5" />}
              label={t.serviceProposals.chatPanel.durationLabel}
              value={Duration.format(proposal.estimatedDurationMinutes)}
              variant="default"
              dataTestId="proposal-duration-info"
            />
          )}
        </div>

        {proposal.description && (
          <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                {t.serviceProposals.chatPanel.descriptionLabel}
              </span>
            </div>
            <p className="text-body leading-relaxed text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto pr-1 font-normal">
              {proposal.description}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
