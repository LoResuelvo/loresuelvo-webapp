"use client";

import { User } from "lucide-react";
import { useState } from "react";
import JobRequestPanel from "./JobRequestPanel";
import { Button } from "@/components/ui/button";

import { JobRequestInfo } from "@/lib/messaging/types";

interface ChatHeaderProps {
  providerName: string;
  providerSurname: string;
  pending: boolean;
  jobRequest?: JobRequestInfo | null;
  onAccept?: () => void;
}

export default function ChatHeader({ providerName, providerSurname, pending, jobRequest, onAccept }: ChatHeaderProps) {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <div className="border-b border-slate-200 bg-white flex-shrink-0">
        <div className="h-16 flex items-center px-6 gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-primary truncate">
              {providerName} {providerSurname}
            </p>
            {pending && (
              <p className="text-[11px] text-amber-600">Esperando aceptación</p>
            )}
          </div>

          {jobRequest && (
            <Button
              onClick={() => setShowPanel(true)}
              className="px-4 py-2 bg-brand-secondary text-white text-[14px] font-semibold rounded-lg hover:bg-brand-secondary/80 transition-colors h-auto"
              aria-label="Ver solicitud de trabajo"
            >
              Ver Solicitud
            </Button>
          )}

          {pending && onAccept && (
            <Button
              onClick={onAccept}
              className="px-4 py-2 bg-brand-secondary text-white text-[14px] font-semibold rounded-lg hover:bg-brand-secondary/80 transition-colors h-auto"
            >
              Ver Solicitud
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
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}