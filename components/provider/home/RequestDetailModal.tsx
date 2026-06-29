"use client";

import { MapPin, Calendar } from "lucide-react";
import { ProviderWorkRequest } from "@/domain/provider/types";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";
import { Modal } from "@/components/ui/modal";
import { DetailPanel } from "@/components/shared/DetailPanel";
import { ImageGalleryPreview } from "@/components/shared/ImageGalleryPreview";

interface RequestDetailModalProps {
  request: ProviderWorkRequest;
  onClose: () => void;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function RequestDetailModal({
  request,
  onClose,
  onAccept,
  onReject,
}: RequestDetailModalProps) {
  const footer = (
    <div className="p-6 pt-4 border-t border-slate-200 bg-slate-50 space-y-3">
      <Button
        variant="accept"
        size="action"
        type="button"
        onClick={() => onAccept(request.id)}
      >
        {t.providerHome.workRequestsSection.modal.acceptBtn}
      </Button>
      <Button
        variant="danger"
        size="action"
        type="button"
        onClick={() => onReject(request.id)}
      >
        {t.providerHome.workRequestsSection.modal.rejectBtn}
      </Button>
    </div>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t.providerHome.workRequestsSection.modal.title}
      closeLabel={t.providerHome.workRequestsSection.modal.closeLabel}
      footer={footer}
    >
      <DetailPanel
        initials={request.clientName.charAt(0)}
        name={request.clientName}
        nameExtra={
          <div className="mt-2 space-y-1">
            <p className="flex items-center gap-2 text-[14px] text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {request.location}
            </p>
            <p className="flex items-center gap-2 text-[14px] text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {request.publishedAtLabel}
            </p>
          </div>
        }
        title={request.problemTitle}
        descriptionLabel={t.providerHome.workRequestsSection.modal.descriptionLabel}
        description={request.description}
      >
        <ImageGalleryPreview
          images={request.images}
          label={t.providerHome.workRequestsSection.modal.imagesLabel}
        />
      </DetailPanel>
    </Modal>
  );
}