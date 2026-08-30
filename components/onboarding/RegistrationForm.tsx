"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";
import { MercadoPagoConnectionStep } from "./MercadoPagoConnectionStep";
import { Category } from "@/domain/shared/types";
import { cn } from "@/lib/utils";
import { useRegistrationForm } from "./useRegistrationForm";

export default function RegistrationForm({
  session,
  categories = [],
  className,
}: {
  session: AuthSession | null;
  categories?: Category[];
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
      {step === 1 && (
        <RoleSelectionStep
          role={role}
          onSelectRole={setRole}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ProfileFormStep
          role={role}
          categories={categories}
          onBack={() => setStep(1)}
          onSubmit={handleFinalSubmit}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 3 && role === "provider" && (
        <MercadoPagoConnectionStep />
      )}
    </div>
  );
}
