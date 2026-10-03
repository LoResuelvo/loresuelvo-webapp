"use client";

import { useEffect, useState } from "react";
import { getCurrentUserAction } from "@/app/api/me/actions";
import type { CalendarConnectionStatus } from "@/domain/user/types";

type WorkOrderCalendarConnection =
  | { state: "loading" }
  | { state: "ready"; status: CalendarConnectionStatus }
  | { state: "error" };

export function useWorkOrderCalendarConnection(): WorkOrderCalendarConnection {
  const [connection, setConnection] = useState<WorkOrderCalendarConnection>({ state: "loading" });

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
