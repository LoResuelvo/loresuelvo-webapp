import InfoBanner from "./InfoBanner";
import { t } from "@/infrastructure/i18n/translations";

interface PendingConversationBannerProps {
  isPending: boolean;
}

export default function PendingConversationBanner({ isPending }: PendingConversationBannerProps) {
  if (!isPending) return null;

  return (
    <InfoBanner tone="info">
      {t.messaging.pendingBannerDefault}
    </InfoBanner>
  );
}
