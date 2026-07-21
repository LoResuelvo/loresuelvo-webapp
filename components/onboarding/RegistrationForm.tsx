"use client";

import { AuthSession } from "@/infrastructure/auth/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { submitRegistration } from "@/app/onboarding/actions";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/files/actions";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";
import { MercadoPagoConnectionStep } from "./MercadoPagoConnectionStep";
import { Category } from "@/domain/shared/types";
import { storageClient } from "@/infrastructure/storage/storage-client";
import { cn } from "@/lib/utils";
import { t } from "@/infrastructure/i18n/translations";

export default function RegistrationForm({
  session: _session,
  categories = [],
  className,
}: {
  session: AuthSession | null;
  categories?: Category[];
  className?: string;
}) {
  const initialStep = (_session?.user?.role === "provider" && !_session?.user?.isOnboarded) ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  const [role, setRole] = useState<"consumer" | "provider" | null>((_session?.user?.role as any) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFinalSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    try {
      if (role) {
        formData.append("role", role);
      }

      if (role === "provider") {
        await handleProfilePhotoUpload(formData);
      }

      const result = await submitRegistration(formData);
      if (role === "provider") {
        setStep(3);
        setIsLoading(false);
      } else {
        if (result?.redirectTo) {
          router.push(result.redirectTo);
        }
      }
    } catch (err) {
      console.error(err);
      setError(t.onboarding.profileForm.errorSave);
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("w-full rounded-2xl border border-border bg-white p-8 shadow-sm transition-all duration-300", className)}>
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

  async function handleProfilePhotoUpload(formData: FormData) {
    const profilePhoto = formData.get("profilePhoto") as File | null;
    if (profilePhoto && profilePhoto.size > 0 && profilePhoto.name !== "") {
      const presigned = await getPresignedUrlAction(
        profilePhoto.name,
        profilePhoto.type,
        profilePhoto.size,
        "provider_profile_photo"
      );

      await storageClient.uploadFile(profilePhoto, presigned.upload_url, presigned.headers);

      const confirmed = await confirmUploadAction(
        presigned.file_id,
        presigned.key,
        profilePhoto.type,
        profilePhoto.size
      );

      formData.delete("profilePhoto");
      formData.append("profilePhotoId", confirmed.id);
      formData.append("profilePhotoUrl", confirmed.url);
    }
  }
}
