"use client";

import { useEffect } from "react";
import InfoBanner from "@/components/messaging/InfoBanner";
import type { CalendarConnectionStatus } from "@/domain/user/types";
import { t } from "@/infrastructure/i18n/translations";
import type { CalendarCallbackResult } from "@/app/profile/calendar-result";

interface CalendarConnectionFeedbackProps {
  result: CalendarCallbackResult | null | undefined;
  status: CalendarConnectionStatus;
}

function normalizeCallbackUrl(): void {
  const url = new URL(window.location.href);
  window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
}

export default function CalendarConnectionFeedback({
  result,
  status,
}: CalendarConnectionFeedbackProps) {
  useEffect(() => {
    if (result) normalizeCallbackUrl();
  }, [result]);

  if (!result) return null;

  const calendarCopy = t.profile.calendar;
  const isConfirmedSuccess = result === "success" && status === "connected";
  const message =
    result === "cancelled"
      ? calendarCopy.connectionCancelled
      : isConfirmedSuccess
        ? calendarCopy.connectionSuccess
        : calendarCopy.connectionSuccessUnconfirmed;
  const tone = isConfirmedSuccess ? "info" : "warning";

  return <InfoBanner tone={tone}>{message}</InfoBanner>;
}
