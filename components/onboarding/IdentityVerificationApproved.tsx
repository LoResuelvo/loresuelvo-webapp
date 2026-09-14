"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import InfoBanner from "@/components/messaging/InfoBanner";
import { t } from "@/infrastructure/i18n/translations";
import { cn } from "@/lib/utils";

interface IdentityVerificationApprovedProps {
  className?: string;
  onContinue?: () => void;
  isContinuing?: boolean;
}

export function IdentityVerificationApproved({
  className,
  onContinue,
  isContinuing = false,
}: IdentityVerificationApprovedProps) {
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
          {t.onboarding.identityVerification.verifiedTitle}
        </h1>
      </div>

      <div className="w-full">
        <InfoBanner>{t.onboarding.identityVerification.verifiedDescription}</InfoBanner>
      </div>

      {onContinue && (
        <div className="mt-6 w-full">
          <Button
            type="button"
            variant="brand"
            size="full"
            onClick={onContinue}
            disabled={isContinuing}
          >
            {isContinuing
              ? t.onboarding.identityVerification.continuing
              : t.onboarding.identityVerification.continueOnboarding}
          </Button>
        </div>
      )}
    </div>
  );
}
