"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startMercadoPagoConnectionAction } from "@/app/onboarding/mercado-pago-actions";
import { t } from "@/infrastructure/i18n/translations";

type StartAuthorizationAction = () => Promise<{ authorizationUrl: string }>;
type NavigateToAuthorization = (authorizationUrl: string) => void;

interface UseMercadoPagoAuthorizationOptions {
  startAuthorizationAction?: StartAuthorizationAction;
  navigate?: NavigateToAuthorization;
  onAuthorizationStarting?: () => void;
  onAuthorizationFailed?: () => void;
}

interface MercadoPagoAuthorizationState {
  isAuthorizing: boolean;
  error: string | null;
  startAuthorization: () => Promise<boolean>;
}

function navigateToAuthorization(authorizationUrl: string): void {
  window.location.assign(authorizationUrl);
}

export function useMercadoPagoAuthorization({
  startAuthorizationAction = startMercadoPagoConnectionAction,
  navigate = navigateToAuthorization,
  onAuthorizationStarting,
  onAuthorizationFailed,
}: UseMercadoPagoAuthorizationOptions = {}): MercadoPagoAuthorizationState {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRequestPending = useRef(false);
  const isMounted = useRef(false);
  const genericError = t.profile.mercadoPago.authorizationError;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const startAuthorization = useCallback(async () => {
    if (!isMounted.current || isRequestPending.current) return false;

    isRequestPending.current = true;
    setIsAuthorizing(true);
    setError(null);
    let authorizationStarted = false;

    try {
      onAuthorizationStarting?.();
      const { authorizationUrl } = await startAuthorizationAction();
      if (!isMounted.current) return false;

      navigate(authorizationUrl);
      authorizationStarted = true;
      return true;
    } catch {
      onAuthorizationFailed?.();
      if (isMounted.current) setError(genericError);
      return false;
    } finally {
      if (!authorizationStarted) {
        isRequestPending.current = false;
        if (isMounted.current) setIsAuthorizing(false);
      }
    }
  }, [
    genericError,
    navigate,
    onAuthorizationFailed,
    onAuthorizationStarting,
    startAuthorizationAction,
  ]);

  return { isAuthorizing, error, startAuthorization };
}
