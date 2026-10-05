import type { WorkOrderCalendarConnectionState } from "./useWorkOrderCalendarConnection";
import WorkOrderCalendarLoading from "./WorkOrderCalendarLoading";
import WorkOrderCalendarLookupError from "./WorkOrderCalendarLookupError";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import Link from "next/link";
import WorkOrderCalendarReauthorization from "./WorkOrderCalendarReauthorization";

export interface WorkOrderCalendarAuthorization {
  isAuthorizing: boolean;
  error: string | null;
  startAuthorization: () => Promise<void>;
}

interface WorkOrderCalendarConnectionProps {
  connection?: WorkOrderCalendarConnectionState;
  profileHref?: string;
  authorization?: WorkOrderCalendarAuthorization;
  showError?: boolean;
}

export default function WorkOrderCalendarConnection({ connection, profileHref, authorization, showError = true }: WorkOrderCalendarConnectionProps) {
  if (connection?.state === "loading") return <WorkOrderCalendarLoading />;
  if (connection?.state === "error") return showError ? <WorkOrderCalendarLookupError /> : null;
  if (connection?.state !== "ready") return null;
  const { status } = connection;

  if (status === "connected") {
    return <InfoBanner>{t.profile.calendar.orderConnectedStatus}</InfoBanner>;
  }

  if (status === "action_required") {
    return <WorkOrderCalendarReauthorization
      onReauthorize={authorization?.startAuthorization}
      isAuthorizing={authorization?.isAuthorizing}
      error={showError ? authorization?.error : null}
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
