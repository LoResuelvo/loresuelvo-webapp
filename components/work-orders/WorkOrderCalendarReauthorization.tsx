import InfoBanner from "@/components/messaging/InfoBanner";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface WorkOrderCalendarReauthorizationProps {
  onReauthorize?: () => void;
  isAuthorizing?: boolean;
  error?: string | null;
}

export default function WorkOrderCalendarReauthorization({ onReauthorize, isAuthorizing = false, error }: WorkOrderCalendarReauthorizationProps) {
  return (
    <div className="space-y-3">
      <InfoBanner tone="warning">{t.profile.calendar.authorizationRequired}</InfoBanner>
      {error && (
        <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-body text-rose-700">
          {error}
        </div>
      )}
      <Button
        type="button"
        variant="brand"
        onClick={onReauthorize}
        disabled={!onReauthorize || isAuthorizing}
        aria-busy={isAuthorizing}
        className="h-auto min-h-11 whitespace-normal text-left"
      >
        {isAuthorizing ? t.profile.calendar.connecting : t.profile.calendar.reauthorizeAction}
      </Button>
    </div>
  );
}
