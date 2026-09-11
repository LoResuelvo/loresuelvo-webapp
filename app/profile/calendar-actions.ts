"use server";

import { startCalendarAuthorization } from "@/application/calendar/start-calendar-authorization";
import { t } from "@/infrastructure/i18n/translations";
import { ApiCalendarConnectionRepository } from "@/infrastructure/repositories/calendar/api-calendar-connection-repository";

export type StartCalendarAuthorizationActionResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; error: string };

export async function startCalendarAuthorizationAction(): Promise<StartCalendarAuthorizationActionResult> {
  try {
    const repository = new ApiCalendarConnectionRepository();
    const { authorizationUrl } = await startCalendarAuthorization(repository);
    return { ok: true, authorizationUrl };
  } catch (error: unknown) {
    return { ok: false, error: t.profile.calendar.authorizationError };
  }
}
