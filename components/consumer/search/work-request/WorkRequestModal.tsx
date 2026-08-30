"use client";

import { Provider } from "@/domain/provider/types";
import { WorkRequestForm } from "./WorkRequestForm";
import { Modal } from "@/components/ui/modal";
import { t } from "@/infrastructure/i18n/translations";

interface WorkRequestModalProps {
  provider: Provider;
  onClose: () => void;
}

export default function WorkRequestModal({ provider, onClose }: WorkRequestModalProps) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t.consumerSearch.modal.title}
      closeLabel={t.consumerSearch.modal.closeLabel}
      className="max-w-lg"
    >
      <WorkRequestForm provider={provider} />
    </Modal>
  );
}
