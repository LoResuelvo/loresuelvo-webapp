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
};

/** Selects the identity presentation; onboarding owns the transitions. */
export function IdentityVerificationStep({
  status = "unverified",
  isRefreshing = false,
  timedOut = false,
  onRefresh,
  ...invitationProps
}: IdentityVerificationStepProps) {
  if (status === "approved") {
    return <IdentityVerificationApproved className={invitationProps.className} />;
  }

  if (status !== "unverified") {
    return (
      <IdentityVerificationResult
        status={status}
        error={invitationProps.error}
        isRefreshing={isRefreshing}
        timedOut={timedOut}
        onRefresh={onRefresh}
        className={invitationProps.className}
      />
    );
  }

  return <IdentityVerificationInvitation {...invitationProps} status={status} />;
}
