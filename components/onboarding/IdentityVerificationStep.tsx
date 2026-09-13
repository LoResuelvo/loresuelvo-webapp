"use client";

import { IdentityVerificationApproved } from "./IdentityVerificationApproved";
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
};

/** Selects the identity presentation; onboarding owns the transitions. */
export function IdentityVerificationStep({
  status = "unverified",
  ...invitationProps
}: IdentityVerificationStepProps) {
  if (status === "approved") {
    return <IdentityVerificationApproved className={invitationProps.className} />;
  }

  return <IdentityVerificationInvitation {...invitationProps} status={status} />;
}
