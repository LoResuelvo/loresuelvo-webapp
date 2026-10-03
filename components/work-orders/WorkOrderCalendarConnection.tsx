import type { CalendarConnectionStatus } from "@/domain/user/types";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import Link from "next/link";

interface WorkOrderCalendarConnectionProps {
  status?: CalendarConnectionStatus;
  profileHref?: string;
}

export default function WorkOrderCalendarConnection({ status, profileHref }: WorkOrderCalendarConnectionProps) {
  if (status === "connected") {
    return <InfoBanner>{t.profile.calendar.orderConnectedStatus}</InfoBanner>;
  }

  if (status === "disconnected" && profileHref) {
    return (
      <InfoBanner>
        {t.profile.calendar.orderDisconnectedInvitation}{" "}
        <Link href={profileHref} className="font-semibold underline rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
          {t.profile.title}
        </Link>.
      </InfoBanner>
    );
  }

  return null;
}
