"use client";

import { AuthSession } from "@/lib/auth/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { submitRegistration } from "@/app/onboarding/registrationButtonAction";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { ProfileFormStep } from "./ProfileFormStep";
import { Category } from "@/lib/api/types";
import { getPresignedUrlAction, confirmUploadAction } from "@/app/onboarding/fileActions";
import { storageClient } from "@/lib/storage/storage-client";


export default function RegistrationForm({
  session: _session,
  categories = [],
}: {
  session: AuthSession | null;
  categories?: Category[];
}) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"consumer" | "provider" | null>(null);
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
      if (result?.redirectTo) {
        router.push(result.redirectTo);
      }
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
            role={role}
            categories={categories}
            onBack={() => setStep(1)}
            onSubmit={handleFinalSubmit}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
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
