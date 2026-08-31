"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSession } from "@/infrastructure/auth/types";
import { submitRegistration } from "@/app/onboarding/actions";
import { prepareFileUploadAction, confirmFileUploadAction } from "@/app/files/actions";
import { storageClient } from "@/infrastructure/storage/storage-client";
import { t } from "@/infrastructure/i18n/translations";

export async function uploadProfilePhoto(formData: FormData): Promise<void> {
  const profilePhoto = formData.get("profilePhoto") as File | null;
  if (profilePhoto && profilePhoto.size > 0 && profilePhoto.name !== "") {
    const presignedRes = await prepareFileUploadAction({
      originalName: profilePhoto.name,
      mimeType: profilePhoto.type,
      sizeBytes: profilePhoto.size,
      purpose: "profile_photo",
    });
    if (!presignedRes.success) throw new Error(presignedRes.error);
    const presigned = presignedRes.data;

    await storageClient.uploadFile(profilePhoto, presigned.uploadUrl, presigned.headers);

    const confirmedRes = await confirmFileUploadAction({
      fileId: presigned.fileId,
      storageKey: presigned.storageKey,
      mimeType: profilePhoto.type,
      sizeBytes: profilePhoto.size,
    });
    if (!confirmedRes.success) throw new Error(confirmedRes.error);
    const confirmed = confirmedRes.data;

    formData.delete("profilePhoto");
    formData.append("profilePhotoId", confirmed.fileId);
    formData.append("profilePhotoUrl", confirmed.url);
  }
}

export function useRegistrationForm(session: AuthSession | null) {
  const initialStep = session?.user?.role === "provider" && !session?.user?.isOnboarded ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  const [role, setRole] = useState<"consumer" | "provider" | null>(
    (session?.user?.role as "consumer" | "provider") || null
  );
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

      if (role === "provider" || role === "consumer") {
        await uploadProfilePhoto(formData);
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

  return {
    step,
    setStep,
    role,
    setRole,
    isLoading,
    error,
    handleFinalSubmit,
  };
}
