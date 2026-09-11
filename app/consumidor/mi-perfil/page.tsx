import ProfileView from "@/components/profile/ProfileView";
import { parseCalendarCallbackResult } from "@/app/profile/calendar-result";
import { getAuthenticatedProfile } from "@/app/profile/profile-page-data";

interface ConsumerProfilePageProps {
  searchParams: Promise<{ calendar_result?: string | string[] }>;
}

export default async function ConsumerProfilePage({
  searchParams,
}: ConsumerProfilePageProps) {
  const params = await searchParams;
  const user = await getAuthenticatedProfile();

  return (
    <ProfileView
      user={user}
      calendarResult={parseCalendarCallbackResult(params.calendar_result)}
    />
  );
}
