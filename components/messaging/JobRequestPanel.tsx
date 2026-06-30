"use client";

import { t } from "@/infrastructure/i18n/translations";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { MessageImage } from "@/domain/messaging/types";
import { ImageGalleryPreview } from "@/components/shared/ImageGalleryPreview";

export interface JobRequestPanelInfo {
  title: string;
  description: string;
  providerName?: string;
  providerSurname?: string;
  providerProfilePhotoUrl?: string;
  images?: MessageImage[];
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
      closeLabel={t.messaging.jobRequestPanel.closeLabel}
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
          <Avatar
            src={jobRequest.providerProfilePhotoUrl}
            initials={initials}
            alt={`${t.messaging.photoAlt} ${jobRequest.providerName ?? ""}`}
            size="lg"
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[18px] font-semibold text-slate-800">
              {jobRequest.providerName ? `${jobRequest.providerName} ${jobRequest.providerSurname}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[24px] font-bold text-brand-primary leading-tight">
            {jobRequest.title}
          </h3>

          {jobRequest.description && (
            <div className="pt-2 space-y-1">
              <span className="text-base font-semibold text-slate-700 uppercase tracking-wide">
                {t.messaging.jobRequestPanel.descriptionLabel}
              </span>
              <p
                data-testid="job-request-description"
                className="mt-2 text-[17px] leading-relaxed text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto pr-2"
              >
                {jobRequest.description}
              </p>
            </div>
          )}

          <ImageGalleryPreview
            images={jobRequest.images}
            label={t.messaging.jobRequestPanel.imagesLabel}
          />
        </div>
      </div>
    </Modal>
  );
}

