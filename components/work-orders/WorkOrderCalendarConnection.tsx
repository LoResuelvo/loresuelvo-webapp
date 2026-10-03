import type { CalendarConnectionStatus } from "@/domain/user/types";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";

interface WorkOrderCalendarConnectionProps {
  status?: CalendarConnectionStatus;
}

export default function WorkOrderCalendarConnection({ status }: WorkOrderCalendarConnectionProps) {
  if (status !== "connected") return null;

  return <InfoBanner>{t.profile.calendar.orderConnectedStatus}</InfoBanner>;
}
