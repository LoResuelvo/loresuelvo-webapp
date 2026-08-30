"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import JobRequestPanel from "@/components/messaging/JobRequestPanel";
import { Avatar } from "@/components/ui/avatar";
import { t } from "@/infrastructure/i18n/translations";
import type { JobRequestInfo, ServiceProposalSummary } from "@/domain/messaging/types";
import ChatHeaderActions from "./ChatHeaderActions";

export interface ChatHeaderContact {
  name: string;
  surname?: string;
  photoUrl?: string;
  role?: string;
}

export interface ChatHeaderConversationState {
  pending?: boolean;
  isProvider?: boolean;
  isLoadingJobRequest?: boolean;
}

export interface ChatHeaderActionsHandlers {
  onAccept?: () => void;
  onOpenProposal?: () => void;
}

export interface ChatHeaderProps {
  contact: ChatHeaderContact;
  conversationState?: ChatHeaderConversationState;
  jobRequest?: JobRequestInfo | null;
  serviceProposal?: ServiceProposalSummary | null;
  actions?: ChatHeaderActionsHandlers;
}

export default function ChatHeader({
  contact,
  conversationState,
  jobRequest,
  serviceProposal,
  actions,
}: ChatHeaderProps) {
  const [showPanel, setShowPanel] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    router.push(pathname);
  };

  const pending = conversationState?.pending ?? false;
  const fullName = [contact.name, contact.surname].filter(Boolean).join(" ");

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
            src={contact.photoUrl}
            alt={`${t.messaging.photoAlt} ${contact.name}`}
            size="sm"
            imgTestId="chat-header-profile-photo"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-primary truncate">
              {fullName}
            </p>
            {pending && (
              <p className="text-caption text-amber-600">{t.messaging.waitingAcceptance}</p>
            )}
          </div>

          <ChatHeaderActions
            conversationState={conversationState}
            jobRequest={jobRequest}
            serviceProposal={serviceProposal}
            actions={{
              onAccept: actions?.onAccept,
              onViewJobRequest: () => setShowPanel(true),
              onOpenProposal: actions?.onOpenProposal,
            }}
          />
        </div>
      </div>

      {showPanel && jobRequest && (
        <JobRequestPanel
          jobRequest={{
            title: jobRequest.title,
            description: jobRequest.description,
            providerName: jobRequest.providerName ?? contact.name,
            providerSurname: jobRequest.providerSurname ?? contact.surname,
            providerProfilePhotoUrl: jobRequest.providerProfilePhotoUrl ?? contact.photoUrl,
            images: jobRequest.images,
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}