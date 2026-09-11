import type { CalendarConnectionRepository } from "@/ports/calendar/calendar-connection-repository";
import { isSafeCalendarAuthorizationUrl } from "@/domain/calendar/types";

export interface StartCalendarAuthorizationResult {
  authorizationUrl: string;
}

export async function startCalendarAuthorization(
  repository: CalendarConnectionRepository,
): Promise<StartCalendarAuthorizationResult> {
  const authorization = await repository.startAuthorization();

  if (!isSafeCalendarAuthorizationUrl(authorization.authorizationUrl)) {
    throw new Error("Calendar authorization URL is unsafe");
  }

  return { authorizationUrl: authorization.authorizationUrl };
}
