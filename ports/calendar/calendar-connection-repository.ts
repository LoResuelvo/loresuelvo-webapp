import type { CalendarAuthorization } from "@/domain/calendar/types";

export interface CalendarConnectionRepository {
  startAuthorization(): Promise<CalendarAuthorization>;
}
