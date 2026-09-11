import { api } from "@/infrastructure/api/base-client";
import type { CalendarConnectionRepository } from "@/ports/calendar/calendar-connection-repository";
import type { CalendarAuthorization } from "@/domain/calendar/types";
import type { ApiCalendarAuthorization } from "@/infrastructure/api/types";
import { mapApiToCalendarAuthorization } from "./calendar-connection-mapper";

export class ApiCalendarConnectionRepository implements CalendarConnectionRepository {
  async startAuthorization(): Promise<CalendarAuthorization> {
    const response = await api.post<ApiCalendarAuthorization>(
      "/me/calendar-connection/authorizations",
      {},
    );
    return mapApiToCalendarAuthorization(response);
  }
}
