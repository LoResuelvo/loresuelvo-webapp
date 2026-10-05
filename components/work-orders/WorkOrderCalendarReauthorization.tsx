import InfoBanner from "@/components/messaging/InfoBanner";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface WorkOrderCalendarReauthorizationProps {
  onReauthorize?: () => void;
  isAuthorizing?: boolean;
}

export default function WorkOrderCalendarReauthorization({ onReauthorize, isAuthorizing = false }: WorkOrderCalendarReauthorizationProps) {
  return (
    <div className="space-y-3">
      <InfoBanner tone="warning">{t.profile.calendar.authorizationRequired}</InfoBanner>
      <Button
        type="button"
        variant="brand"
        onClick={onReauthorize}
        disabled={!onReauthorize || isAuthorizing}
        className="h-auto min-h-11 whitespace-normal text-left"
      >
        {t.profile.calendar.reauthorizeAction}
      </Button>
    </div>
  );
}
