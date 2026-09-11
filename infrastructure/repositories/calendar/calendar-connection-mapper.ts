import type { ApiCalendarAuthorization } from "@/infrastructure/api/types";
import type { CalendarAuthorization } from "@/domain/calendar/types";

export function mapApiToCalendarAuthorization(
  apiAuthorization: ApiCalendarAuthorization,
): CalendarAuthorization {
  return {
    authorizationUrl: apiAuthorization.authorization_url,
    state: apiAuthorization.state,
  };
}
