"use client";

import { t } from "@/infrastructure/i18n/translations";
import { Modal } from "@/components/ui/modal";

export interface JobRequestPanelInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
}

interface JobRequestPanelProps {
  jobRequest: JobRequestPanelInfo;
  onClose: () => void;
}

export default function JobRequestPanel({ jobRequest, onClose }: JobRequestPanelProps) {
  const initials = jobRequest.providerName
    ? jobRequest.providerName.charAt(0).toUpperCase()
    : "P";

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t.messaging.jobRequestPanel.title}
      titleId="job-request-panel-title"
      closeLabel={t.messaging.jobRequestPanel.closeLabel}
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
            <span className="text-lg font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0 flex items-center h-16">
            {jobRequest.providerName && (
              <p className="text-[18px] font-semibold text-slate-800">
                {jobRequest.providerName} {jobRequest.providerSurname}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[24px] font-bold text-brand-primary leading-tight">
            {jobRequest.title}
          </h3>

          {jobRequest.description && (
            <div className="pt-2 space-y-1">
              <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                {t.messaging.jobRequestPanel.descriptionLabel}
              </span>
              <p className="text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                {jobRequest.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
