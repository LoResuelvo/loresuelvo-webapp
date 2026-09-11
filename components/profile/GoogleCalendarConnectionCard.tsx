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
  const statusLabel = {
    disconnected: calendarCopy.disconnectedStatus,
    connected: calendarCopy.connectedStatus,
    action_required: calendarCopy.actionRequiredStatus,
  }[status];

  return (
    <Card
      role="region"
      aria-labelledby="google-calendar-card-title"
      className="w-full max-w-2xl"
    >
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-secondary/10 p-2 text-brand-secondary" aria-hidden="true">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 id="google-calendar-card-title" className="font-heading text-lg font-semibold">
              {calendarCopy.title}
            </h2>
            <CardDescription>{calendarCopy.description}</CardDescription>
          </div>
        </div>
        <Badge
          variant={status === "connected" ? "success" : status === "action_required" ? "warning" : "outline"}
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent>
        {status === "action_required" && (
          <InfoBanner tone="warning">{calendarCopy.authorizationRequired}</InfoBanner>
        )}
        {authorizationError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-body text-rose-700"
          >
            {authorizationError}
          </div>
        )}
        {status === "disconnected" && (
          <Button
            type="button"
            variant="brandSecondary"
            disabled={isAuthorizing || !onAuthorize}
            onClick={onAuthorize}
          >
            {isAuthorizing ? calendarCopy.connecting : calendarCopy.connectAction}
          </Button>
        )}
        {status === "action_required" && (
          <Button
            type="button"
            variant="brandSecondary"
            disabled={isAuthorizing || !onAuthorize}
            onClick={onAuthorize}
          >
            {isAuthorizing ? calendarCopy.connecting : calendarCopy.reauthorizeAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
