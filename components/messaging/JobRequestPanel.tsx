"use client";

import { t } from "@/infrastructure/i18n/translations";
import { Modal } from "@/components/ui/modal";
import { DetailPanel } from "@/components/shared/DetailPanel";

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
      <DetailPanel
        initials={initials}
        name={jobRequest.providerName ? `${jobRequest.providerName} ${jobRequest.providerSurname}` : ""}
        title={jobRequest.title}
        descriptionLabel={t.messaging.jobRequestPanel.descriptionLabel}
        description={jobRequest.description}
      />
    </Modal>
  );
}
