"use client";

import { IdentityVerificationApproved } from "./IdentityVerificationApproved";
import { IdentityVerificationResult } from "./IdentityVerificationResult";
import {
  IdentityVerificationInvitation,
  type IdentityVerificationInvitationProps,
} from "./IdentityVerificationInvitation";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";

type IdentityVerificationStepProps = Omit<
  IdentityVerificationInvitationProps,
  "status"
> & {
  status?: IdentityVerificationStatus | null;
  isRefreshing?: boolean;
  timedOut?: boolean;
  onRefresh?: () => void;
  onContinue?: () => void;
  isContinuing?: boolean;
};

/** Selects the identity presentation; onboarding owns the transitions. */
export function IdentityVerificationStep({
  status = "unverified",
  isLoading = false,
  isRefreshing = false,
  timedOut = false,
  onRefresh,
  onContinue,
  isContinuing = false,
  ...invitationProps
}: IdentityVerificationStepProps) {
  if (status === "approved") {
    return (
      <IdentityVerificationApproved
        className={invitationProps.className}
        onContinue={onContinue}
        isContinuing={isContinuing}
      />
    );
  }

  if (status !== "unverified") {
    return (
      <IdentityVerificationResult
        status={status}
        isLoading={isLoading}
        error={invitationProps.error}
        isRefreshing={isRefreshing}
        timedOut={timedOut}
        onRefresh={onRefresh}
        onContinue={onContinue}
        isContinuing={isContinuing}
        className={invitationProps.className}
      />
    );
  }

  return (
    <IdentityVerificationInvitation
      {...invitationProps}
      status={status}
      isLoading={isLoading}
    />
  );
}
