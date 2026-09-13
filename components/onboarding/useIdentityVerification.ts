"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";
import {
  startIdentityVerificationAction,
} from "@/app/onboarding/identity-actions";
import { t } from "@/infrastructure/i18n/translations";

interface IdentityVerificationController {
  status: IdentityVerificationStatus | null;
  isStarting: boolean;
  error: string | null;
  start: () => Promise<void>;
}

export function useIdentityVerification(
  initialStatus: IdentityVerificationStatus | null = "unverified",
): IdentityVerificationController {
  const router = useRouter();
  const [status, setStatus] = useState<IdentityVerificationStatus | null>(initialStatus);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const start = useCallback(async () => {
    if (requestInFlight.current || status === "approved") {
      return;
    }

    requestInFlight.current = true;
    setIsStarting(true);
    setError(null);

    try {
      const result = await startIdentityVerificationAction();
      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data.kind === "already_verified") {
        setStatus("approved");
        return;
      }

      router.push(result.data.verificationUrl);
    } catch {
      setError(t.onboarding.identityVerification.errorGeneric);
    } finally {
      requestInFlight.current = false;
      setIsStarting(false);
    }
  }, [router, status]);

  return { status, isStarting, error, start };
}
