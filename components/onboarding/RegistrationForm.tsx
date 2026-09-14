"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";
import { MercadoPagoConnectionStep } from "./MercadoPagoConnectionStep";
import { Category } from "@/domain/shared/types";
import { cn } from "@/lib/utils";
import { useRegistrationForm } from "./useRegistrationForm";
import { IdentityVerificationStep } from "./IdentityVerificationStep";
import { useIdentityVerification } from "./useIdentityVerification";
import { useIdentityVerificationStatus } from "./useIdentityVerificationStatus";
import { readIdentityVerificationStatusAction } from "@/app/onboarding/identity-status-actions";
import type { GoogleMapsRuntimeConfig } from "@/infrastructure/config/public-runtime-config";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";
import type { RegistrationStep } from "./useRegistrationForm";

export default function RegistrationForm({
  session,
  categories = [],
  googleMapsConfig = {},
  initialStep,
  initialIdentityStatus = "unverified",
  className,
}: {
  session: AuthSession | null;
  categories?: Category[];
  googleMapsConfig?: GoogleMapsRuntimeConfig;
  initialStep?: RegistrationStep;
  initialIdentityStatus?: IdentityVerificationStatus | null;
  className?: string;
}) {
  const {
    step,
    setStep,
    role,
    setRole,
    isLoading,
    error,
    handleFinalSubmit,
    goToMercadoPago,
  } = useRegistrationForm(session, initialStep);
  const identity = useIdentityVerification(initialIdentityStatus);
  const identityStatus = useIdentityVerificationStatus({
    readStatus: readIdentityVerificationStatusAction,
    initialStatus: initialIdentityStatus,
    enabled: step === "identity" && role === "provider",
  });
  const displayedIdentityStatus =
    identityStatus.status ??
    (identityStatus.isLoading || identityStatus.error ? null : identity.status);

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border bg-white p-8 shadow-sm transition-all duration-300",
        className
      )}
    >
      {step === "role" && (
        <RoleSelectionStep
          role={role}
          onSelectRole={setRole}
          onContinue={() => setStep("profile")}
        />
      )}
      {step === "profile" && (
        <ProfileFormStep
          role={role}
          categories={categories}
          googleMapsConfig={googleMapsConfig}
          onBack={() => setStep("role")}
          onSubmit={handleFinalSubmit}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === "identity" && role === "provider" && (
        <IdentityVerificationStep
          onVerifyNow={identity.start}
          onLater={goToMercadoPago}
          onContinue={goToMercadoPago}
          status={displayedIdentityStatus}
          isLoading={identity.isStarting || identityStatus.isLoading}
          isRefreshing={identityStatus.isRefreshing}
          timedOut={identityStatus.timedOut}
          onRefresh={identityStatus.refresh}
          error={identity.error ?? identityStatus.error}
        />
      )}
      {step === "mercadoPago" && role === "provider" && (
        <MercadoPagoConnectionStep />
      )}
    </div>
  );
}
