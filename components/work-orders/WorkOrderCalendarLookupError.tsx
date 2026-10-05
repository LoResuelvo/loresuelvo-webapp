import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";

export default function WorkOrderCalendarLookupError() {
  return <InfoBanner tone="warning">{t.profile.calendar.orderConnectionError}</InfoBanner>;
}
