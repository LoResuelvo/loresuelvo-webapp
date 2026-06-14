import InfoBanner from "./InfoBanner";

interface PendingConversationBannerProps {
  isPending: boolean;
}

export default function PendingConversationBanner({ isPending }: PendingConversationBannerProps) {
  if (!isPending) return null;

  return (
    <InfoBanner tone="info">
      Solicitud de contacto enviada. El prestador aún no aceptó la conversación.
    </InfoBanner>
  );
}
