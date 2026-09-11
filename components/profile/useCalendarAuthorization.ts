"use client";

import { useCallback, useRef, useState } from "react";
import {
  isSafeCalendarAuthorizationUrl,
} from "@/domain/calendar/types";
import {
  startCalendarAuthorizationAction,
  type StartCalendarAuthorizationActionResult,
} from "@/app/profile/calendar-actions";
import { t } from "@/infrastructure/i18n/translations";

type StartAuthorizationAction = () => Promise<StartCalendarAuthorizationActionResult>;
type NavigateToAuthorization = (authorizationUrl: string) => void;

interface UseCalendarAuthorizationOptions {
  startAuthorizationAction?: StartAuthorizationAction;
  navigate?: NavigateToAuthorization;
}

interface CalendarAuthorizationState {
  isAuthorizing: boolean;
  error: string | null;
  startAuthorization: () => Promise<void>;
}

function navigateToAuthorization(authorizationUrl: string): void {
  window.location.assign(authorizationUrl);
}

export function useCalendarAuthorization({
  startAuthorizationAction = startCalendarAuthorizationAction,
  navigate = navigateToAuthorization,
}: UseCalendarAuthorizationOptions = {}): CalendarAuthorizationState {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRequestPending = useRef(false);
  const genericError = t.profile.calendar.authorizationError;

  const startAuthorization = useCallback(async () => {
    if (isRequestPending.current) return;

    isRequestPending.current = true;
    setIsAuthorizing(true);
    setError(null);

    try {
      const result = await startAuthorizationAction();
      if (!result.ok || !isSafeCalendarAuthorizationUrl(result.authorizationUrl)) {
        setError(result.ok ? genericError : result.error);
        return;
      }

      navigate(result.authorizationUrl);
    } catch {
      setError(genericError);
    } finally {
      isRequestPending.current = false;
      setIsAuthorizing(false);
    }
  }, [genericError, navigate, startAuthorizationAction]);

  return { isAuthorizing, error, startAuthorization };
}
