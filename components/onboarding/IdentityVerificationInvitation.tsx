"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";

export interface IdentityVerificationInvitationProps {
  onVerifyNow: () => void;
  onLater: () => void;
  status: IdentityVerificationStatus | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

interface IdentityVerificationActionsProps {
  onVerifyNow: () => void;
  onLater: () => void;
  isLoading: boolean;
  statusUnavailable: boolean;
}

function IdentityVerificationActions({
  onVerifyNow,
  onLater,
  isLoading,
  statusUnavailable,
}: IdentityVerificationActionsProps) {
  if (statusUnavailable) {
    return (
      <div className="w-full">
        <Button
          id="identity-later-btn"
          type="button"
          variant="ghost"
          size="full"
          onClick={onLater}
        >
          {t.onboarding.identityVerification.later}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <Button
        id="identity-verify-now-btn"
        type="button"
        variant="brand"
        size="full"
        onClick={onVerifyNow}
        disabled={isLoading}
      >
        {isLoading
          ? t.onboarding.identityVerification.starting
          : t.onboarding.identityVerification.verifyNow}
      </Button>
      <Button
        id="identity-later-btn"
        type="button"
        variant="ghost"
        size="full"
        onClick={onLater}
        disabled={isLoading}
      >
        {t.onboarding.identityVerification.later}
      </Button>
    </div>
  );
}

function IdentityVerificationStatusNotice({
  statusUnavailable,
  error,
}: {
  statusUnavailable: boolean;
  error: string | null;
}) {
  if (statusUnavailable) {
    return (
      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
        {error ?? t.onboarding.identityVerification.errorRead}
      </div>
    );
  }

  return <InfoBanner>{t.onboarding.identityVerification.accountCreated}</InfoBanner>;
}

export function IdentityVerificationInvitation({
  onVerifyNow,
  onLater,
  status,
  isLoading = false,
  error = null,
  className,
}: IdentityVerificationInvitationProps) {
  const statusUnavailable = status === null;

  return (
    <div
      className={cn("w-full flex flex-col items-center", className)}
      data-testid="identity-verification-step"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-title font-bold leading-tight tracking-tight text-brand-primary">
          {t.onboarding.identityVerification.title}
        </h1>
        <p className="text-body-lg text-muted-foreground max-w-[340px] mx-auto">
          {t.onboarding.identityVerification.subtitle}
        </p>
      </div>

      <div className="mb-6 w-full">
        <IdentityVerificationStatusNotice
          statusUnavailable={statusUnavailable}
          error={error}
        />
      </div>

      {!statusUnavailable && error && (
        <div className="mb-6 w-full rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}
      <IdentityVerificationActions
        onVerifyNow={onVerifyNow}
        onLater={onLater}
        isLoading={isLoading}
        statusUnavailable={statusUnavailable}
      />
    </div>
  );
}
