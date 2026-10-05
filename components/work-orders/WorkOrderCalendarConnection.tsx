import type { CalendarConnectionStatus } from "@/domain/user/types";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import Link from "next/link";
import WorkOrderCalendarReauthorization from "./WorkOrderCalendarReauthorization";

export interface WorkOrderCalendarAuthorization {
  isAuthorizing: boolean;
  startAuthorization: () => Promise<void>;
}

interface WorkOrderCalendarConnectionProps {
  status?: CalendarConnectionStatus;
  profileHref?: string;
  authorization?: WorkOrderCalendarAuthorization;
}

export default function WorkOrderCalendarConnection({ status, profileHref, authorization }: WorkOrderCalendarConnectionProps) {
  if (status === "connected") {
    return <InfoBanner>{t.profile.calendar.orderConnectedStatus}</InfoBanner>;
  }

  if (status === "action_required") {
    return <WorkOrderCalendarReauthorization
      onReauthorize={authorization?.startAuthorization}
      isAuthorizing={authorization?.isAuthorizing}
    />;
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
