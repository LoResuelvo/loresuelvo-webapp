"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createIdentityVerificationStatusController,
  type IdentityVerificationStatusController,
  type IdentityVerificationStatusControllerState,
  type IdentityVerificationStatusReadResult,
} from "./identity-verification-status-controller";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";

interface UseIdentityVerificationStatusOptions {
  readStatus: () => Promise<IdentityVerificationStatusReadResult>;
  initialStatus?: IdentityVerificationStatus | null;
  pollPending?: boolean;
}

const emptyState: IdentityVerificationStatusControllerState = {
  status: null,
  isLoading: false,
  isRefreshing: false,
  timedOut: false,
  error: null,
};

export function useIdentityVerificationStatus({
  readStatus,
  initialStatus = null,
  pollPending = false,
}: UseIdentityVerificationStatusOptions) {
  const [state, setState] = useState<IdentityVerificationStatusControllerState>(() => ({
    ...emptyState,
    status: initialStatus ?? null,
    isLoading: initialStatus == null,
  }));
  const controllerRef = useRef<IdentityVerificationStatusController | null>(null);

  useEffect(() => {
    const controller = createIdentityVerificationStatusController({
      readStatus,
      initialStatus,
      pollPending,
      onStateChange: setState,
    });
    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [initialStatus, pollPending, readStatus]);

  const refresh = useCallback(() => {
    controllerRef.current?.refresh();
  }, []);

  return { ...state, refresh };
}
