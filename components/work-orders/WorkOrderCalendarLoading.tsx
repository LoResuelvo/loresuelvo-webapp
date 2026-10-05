import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";

export default function WorkOrderCalendarLoading() {
  return <InfoBanner>{t.profile.calendar.orderConnectionLoading}</InfoBanner>;
}
