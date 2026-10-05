"use client";

import { useEffect, useState } from "react";
import { getCurrentUserAction } from "@/app/api/me/actions";
import type { CalendarConnectionStatus } from "@/domain/user/types";

export type WorkOrderCalendarConnectionState =
  | { state: "loading" }
  | { state: "ready"; status: CalendarConnectionStatus }
  | { state: "error" };

export function useWorkOrderCalendarConnection(): WorkOrderCalendarConnectionState {
  const [connection, setConnection] = useState<WorkOrderCalendarConnectionState>({ state: "loading" });

  useEffect(() => {
    let active = true;
    getCurrentUserAction()
      .then((user) => {
        if (active) setConnection({ state: "ready", status: user.calendarConnectionStatus });
      })
      .catch(() => {
        if (active) setConnection({ state: "error" });
      });

    return () => { active = false; };
  }, []);

  return connection;
}
