"use client";

import { useState } from "react";
import JobRequestPanel from "./JobRequestPanel";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { Avatar } from "@/components/ui/avatar";

import { JobRequestInfo } from "@/domain/messaging/types";

interface ChatHeaderProps {
  providerName: string;
  providerSurname: string;
  pending: boolean;
  jobRequest?: JobRequestInfo | null;
  onAccept?: () => void;
  profilePhotoUrl?: string;
}

import { ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function ChatHeader({ providerName, providerSurname, pending, jobRequest, onAccept, profilePhotoUrl }: ChatHeaderProps) {
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
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}