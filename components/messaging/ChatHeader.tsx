"use client";

import { useState } from "react";
import JobRequestPanel from "./JobRequestPanel";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";

import { JobRequestInfo, ServiceProposalSummary } from "@/domain/messaging/types";
import { formatAmountCents } from "@/lib/proposal-utils";

interface ChatHeaderProps {
  providerName: string;
  providerSurname: string;
  pending: boolean;
  jobRequest?: JobRequestInfo | null;
  isLoadingJobRequest?: boolean;
  onAccept?: () => void;
  profilePhotoUrl?: string;
  serviceProposal?: ServiceProposalSummary | null;
  onOpenProposal?: () => void;
  isProvider?: boolean;
}

import { ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function ChatHeader({
  providerName,
  providerSurname,
  pending,
  jobRequest,
  isLoadingJobRequest,
  onAccept,
  profilePhotoUrl,
  serviceProposal,
  onOpenProposal,
  isProvider = false,
}: ChatHeaderProps) {
  const [showPanel, setShowPanel] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    router.push(pathname);
  };

  return (
    <>
      <div className="border-b border-slate-200 bg-white flex-shrink-0">
        <div className="h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4">
          <button
            onClick={handleBack}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-brand-primary transition-colors"
            aria-label="Volver a la lista"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Avatar
            src={profilePhotoUrl}
            alt={`${t.messaging.photoAlt} ${providerName}`}
            size="sm"
            imgTestId="chat-header-profile-photo"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-primary truncate">
              {providerName} {providerSurname}
            </p>
            {pending && (
              <p className="text-[11px] text-amber-600">{t.messaging.waitingAcceptance}</p>
            )}
          </div>

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
              <span className="font-bold">{formatAmountCents(serviceProposal.amountCents)}</span>
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
                  onClick={() => setShowPanel(true)}
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
        </div>
      </div>

      {showPanel && jobRequest && (
        <JobRequestPanel
          jobRequest={{
            title: jobRequest.title,
            description: jobRequest.description,
            providerName: jobRequest.providerName ?? providerName,
            providerSurname: jobRequest.providerSurname ?? providerSurname,
            providerProfilePhotoUrl: jobRequest.providerProfilePhotoUrl ?? profilePhotoUrl,
            images: jobRequest.images,
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}