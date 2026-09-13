"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";
import { MercadoPagoConnectionStep } from "./MercadoPagoConnectionStep";
import { Category } from "@/domain/shared/types";
import { cn } from "@/lib/utils";
import { useRegistrationForm } from "./useRegistrationForm";
import { IdentityVerificationStep } from "./IdentityVerificationStep";
import type { GoogleMapsRuntimeConfig } from "@/infrastructure/config/public-runtime-config";

export default function RegistrationForm({
  session,
  categories = [],
  googleMapsConfig = {},
  className,
}: {
  session: AuthSession | null;
  categories?: Category[];
  googleMapsConfig?: GoogleMapsRuntimeConfig;
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
  } = useRegistrationForm(session);

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
          onVerifyNow={() => setStep("identity")}
          onLater={() => setStep("mercadoPago")}
        />
      )}
      {step === "mercadoPago" && role === "provider" && (
        <MercadoPagoConnectionStep />
      )}
    </div>
  );
}
