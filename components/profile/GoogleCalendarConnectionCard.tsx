"use client";

import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import InfoBanner from "@/components/messaging/InfoBanner";
import type { CalendarConnectionStatus } from "@/domain/user/types";
import { t } from "@/infrastructure/i18n/translations";
import { useCalendarAuthorization } from "./useCalendarAuthorization";

interface GoogleCalendarConnectionCardProps {
  status: CalendarConnectionStatus;
  isAuthorizing?: boolean;
  authorizationError?: string | null;
  onAuthorize?: () => void;
}

export default function GoogleCalendarConnectionCard({
  status,
  isAuthorizing = false,
  authorizationError = null,
  onAuthorize,
}: GoogleCalendarConnectionCardProps) {
  const calendarCopy = t.profile.calendar;
  const authorization = useCalendarAuthorization();
  const resolvedIsAuthorizing = isAuthorizing || authorization.isAuthorizing;
  const resolvedAuthorizationError = authorizationError ?? authorization.error;
  const handleAuthorize = onAuthorize ?? (() => void authorization.startAuthorization());
  const statusLabel = {
    disconnected: calendarCopy.disconnectedStatus,
    connected: calendarCopy.connectedStatus,
    action_required: calendarCopy.actionRequiredStatus,
  }[status];

  return (
    <Card
      role="region"
      aria-labelledby="google-calendar-card-title"
      className="w-full"
    >
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="shrink-0 rounded-xl bg-brand-secondary/10 p-2 text-brand-secondary" aria-hidden="true">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="google-calendar-card-title" className="font-heading text-lg font-semibold">
              {calendarCopy.title}
            </h3>
            <CardDescription className="mt-1 leading-relaxed">{calendarCopy.description}</CardDescription>
          </div>
        </div>
        <Badge
          data-state={status}
          className="shrink-0 self-start px-3 py-1 ring-1 ring-inset ring-slate-200/70 data-[state=disconnected]:bg-slate-100 data-[state=disconnected]:text-slate-600"
          variant={status === "connected" ? "success" : status === "action_required" ? "warning" : "outline"}
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 sm:pl-18">
        {status === "action_required" && (
          <InfoBanner tone="warning">{calendarCopy.authorizationRequired}</InfoBanner>
        )}
        {resolvedAuthorizationError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-body text-rose-700"
          >
            {resolvedAuthorizationError}
          </div>
        )}
        {status === "disconnected" && (
          <Button
            type="button"
            variant="brandSecondary"
            size="action"
            className="min-h-11 whitespace-normal sm:w-auto sm:px-5"
            disabled={resolvedIsAuthorizing}
            onClick={handleAuthorize}
          >
            {resolvedIsAuthorizing ? calendarCopy.connecting : calendarCopy.connectAction}
          </Button>
        )}
        {status === "action_required" && (
          <Button
            type="button"
            variant="brandSecondary"
            size="action"
            className="min-h-11 whitespace-normal sm:w-auto sm:px-5"
            disabled={resolvedIsAuthorizing}
            onClick={handleAuthorize}
          >
            {resolvedIsAuthorizing ? calendarCopy.connecting : calendarCopy.reauthorizeAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
