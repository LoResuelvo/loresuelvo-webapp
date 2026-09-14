"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";
import {
  classifyIdentityVerificationStatus,
  isIdentityVerificationPending,
} from "@/domain/identity-verification/result";
import type { IdentityVerificationResultKind } from "@/domain/identity-verification/result";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";

export interface IdentityVerificationResultProps {
  status: IdentityVerificationStatus | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  timedOut?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onContinue?: () => void;
  isContinuing?: boolean;
  className?: string;
}

const resultCopy = {
  verified: {
    title: t.onboarding.identityVerification.verifiedTitle,
    description: t.onboarding.identityVerification.verifiedDescription,
  },
  pending: {
    title: t.onboarding.identityVerification.pendingTitle,
    description: t.onboarding.identityVerification.pendingDescription,
  },
  declined: {
    title: t.onboarding.identityVerification.declinedTitle,
    description: t.onboarding.identityVerification.declinedDescription,
  },
  abandoned: {
    title: t.onboarding.identityVerification.abandonedTitle,
    description: t.onboarding.identityVerification.abandonedDescription,
  },
  expired: {
    title: t.onboarding.identityVerification.expiredTitle,
    description: t.onboarding.identityVerification.expiredDescription,
  },
  not_started: {
    title: t.onboarding.identityVerification.notStartedTitle,
    description: t.onboarding.identityVerification.notStartedDescription,
  },
} as const;

function LoadingState() {
  return (
    <div className="flex w-full flex-col items-center gap-4 py-8" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-hidden="true" />
      <p className="text-body text-muted-foreground">
        {t.onboarding.identityVerification.loading}
      </p>
    </div>
  );
}

function ErrorState({
  error,
  onRefresh,
  isRefreshing,
}: Pick<IdentityVerificationResultProps, "error" | "onRefresh" | "isRefreshing">) {
  return (
    <div className="w-full space-y-5" data-testid="identity-verification-result-error">
      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
        {error ?? t.onboarding.identityVerification.errorRead}
      </div>
      {onRefresh && (
        <Button
          type="button"
          variant="brand"
          size="full"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing
            ? t.onboarding.identityVerification.refreshing
            : t.onboarding.identityVerification.refresh}
        </Button>
      )}
    </div>
  );
}

function ResultDetails({
  kind,
  description,
  error,
  timedOut,
  canRefresh,
  isRefreshing,
  onRefresh,
  onContinue,
  isContinuing,
}: {
  kind: IdentityVerificationResultKind;
  description: string;
  error: string | null;
  timedOut: boolean;
  canRefresh: boolean;
  isRefreshing: boolean;
  onRefresh?: () => void;
  onContinue?: () => void;
  isContinuing: boolean;
}) {
  const tone =
    kind === "declined" || kind === "abandoned" || kind === "expired"
      ? "warning"
      : "info";

  return (
    <div className="w-full space-y-4">
      <InfoBanner tone={tone}>{description}</InfoBanner>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {timedOut && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          {t.onboarding.identityVerification.timedOut}
        </div>
      )}

      {canRefresh && onRefresh && (
        <Button
          type="button"
          variant="brand"
          size="full"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing
            ? t.onboarding.identityVerification.refreshing
            : t.onboarding.identityVerification.refresh}
        </Button>
      )}

      {onContinue && (
        <Button
          type="button"
          variant="ghost"
          size="full"
          onClick={onContinue}
          disabled={isContinuing}
        >
          {isContinuing
            ? t.onboarding.identityVerification.continuing
            : t.onboarding.identityVerification.continueOnboarding}
        </Button>
      )}
    </div>
  );
}

function ResultState({
  status,
  isRefreshing,
  timedOut,
  error,
  onRefresh,
  onContinue,
  isContinuing = false,
  className,
}: Omit<IdentityVerificationResultProps, "isLoading"> & {
  status: IdentityVerificationStatus;
  isRefreshing: boolean;
  timedOut: boolean;
  error: string | null;
}) {
  const kind = classifyIdentityVerificationStatus(status);
  const copy = resultCopy[kind];
  const canRefresh = onRefresh && isIdentityVerificationPending(status);

  return (
    <div
      className={cn("flex w-full flex-col items-center", className)}
      data-testid="identity-verification-result"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-title font-bold leading-tight tracking-tight text-brand-primary">
          {copy.title}
        </h1>
      </div>

      <ResultDetails
        kind={kind}
        description={copy.description}
        error={error}
        timedOut={timedOut}
        canRefresh={Boolean(canRefresh)}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onContinue={onContinue}
        isContinuing={isContinuing}
      />
    </div>
  );
}

export function IdentityVerificationResult({
  status,
  isLoading = false,
  isRefreshing = false,
  timedOut = false,
  error = null,
  onRefresh,
  onContinue,
  isContinuing = false,
  className,
}: IdentityVerificationResultProps) {
  if (isLoading && status === null) {
    return <LoadingState />;
  }

  if (status === null) {
    return <ErrorState error={error} onRefresh={onRefresh} isRefreshing={isRefreshing} />;
  }

  return (
    <ResultState
      status={status}
      isRefreshing={isRefreshing}
      timedOut={timedOut}
      error={error}
      onRefresh={onRefresh}
      onContinue={onContinue}
      isContinuing={isContinuing}
      className={className}
    />
  );
}
