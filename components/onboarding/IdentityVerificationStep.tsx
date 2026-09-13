"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface IdentityVerificationStepProps {
  onVerifyNow: () => void;
  onLater: () => void;
  className?: string;
}

/** Presentational invitation; the onboarding controller owns both transitions. */
export function IdentityVerificationStep({
  onVerifyNow,
  onLater,
  className,
}: IdentityVerificationStepProps) {
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
        <InfoBanner>{t.onboarding.identityVerification.accountCreated}</InfoBanner>
      </div>

      <div className="w-full space-y-3">
        <Button
          id="identity-verify-now-btn"
          type="button"
          variant="brand"
          size="full"
          onClick={onVerifyNow}
        >
          {t.onboarding.identityVerification.verifyNow}
        </Button>
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
    </div>
  );
}
