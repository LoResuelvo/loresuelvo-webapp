"use client";

import { AuthSession } from "@/lib/auth/types";
import { ChangeEvent, useState } from "react";

import { submitRegistration } from "@/app/onboarding/registrationButtonAction";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";

export default function RegistrationForm({ session }: { session: AuthSession | null }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"consumer" | "provider" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      if (role) {
        formData.append("role", role);
      }
      await submitRegistration(formData);
    } catch (err) {
      console.error(err);
      setError("Hubo un problema al guardar tu perfil. Inténtalo nuevamente.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-neutral p-4 font-sans text-brand-primary">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-white p-8 shadow-sm transition-all duration-300">
        
        {step === 1 ? (
          <RoleSelectionStep
            role={role}
            onSelectRole={setRole}
            onContinue={() => setStep(2)}
          />
        ) : (
          <ProfileFormStep
            onBack={() => setStep(1)}
            onSubmit={onSubmit}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
