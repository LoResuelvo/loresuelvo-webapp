"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { Category } from "@/domain/shared/types";
import { CategorySelect } from "./CategorySelect";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { t } from "@/infrastructure/i18n/translations";
import { validateProfileForm, validateProfilePhoto } from "@/domain/onboarding/validation";

import { cn } from "@/lib/utils";

interface ProfileFormStepProps {
  onBack: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  role: "consumer" | "provider" | null;
  categories: Category[];
  className?: string;
}

export function ProfileFormStep({
  onBack,
  onSubmit,
  isLoading,
  error,
  role,
  categories,
  className,
}: ProfileFormStepProps) {
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(null);

  async function handleFormSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setFirstNameError(null);
    setLastNameError(null);
    setCategoryError(null);
    setProfilePhotoError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const categoryId = formData.get("categoryId") as string;

    let photoSize = 0;
    let photoName = "";
    let photoType = "";

    if (role === "provider") {
      const profilePhoto = formData.get("profilePhoto") as File;
      if (profilePhoto) {
        photoSize = profilePhoto.size;
        photoName = profilePhoto.name;
        photoType = profilePhoto.type;
      }
    }

    const { isValid, errors } = validateProfileForm(
      firstName,
      lastName,
      role,
      categoryId,
      photoSize,
      photoName,
      photoType,
      t.onboarding.profileForm
    );

    if (errors.firstName) setFirstNameError(errors.firstName);
    if (errors.lastName) setLastNameError(errors.lastName);
    if (errors.categoryId) setCategoryError(errors.categoryId);
    if (errors.profilePhoto) setProfilePhotoError(errors.profilePhoto);

    if (!isValid) {
      return;
    }

    await onSubmit(formData);
  }

  return (
    <div className={cn("w-full", className)}>
      <Button
        variant="ghost"
        type="button"
        onClick={onBack}
        className="mb-6 h-auto p-0 flex items-center text-sm font-semibold text-muted-foreground hover:text-brand-primary hover:bg-transparent transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> {t.onboarding.profileForm.back}
      </Button>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-tight text-brand-primary">
          {t.onboarding.profileForm.title}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {t.onboarding.profileForm.subtitle}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
        {role === "provider" && (
          <ProfilePhotoUpload
            onPhotoSelected={(file) => {
              if (file) {
                const photoError = validateProfilePhoto(file, t.onboarding.profileForm);
                setProfilePhotoError(photoError);
              } else {
                setProfilePhotoError(null);
              }
            }}
            error={profilePhotoError}
          />
        )}
        
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-[14px] font-semibold text-brand-primary">
            {t.onboarding.profileForm.name}
          </Label>
          <Input
            id="firstName"
            name="firstName"
            placeholder="Ej. Juan"
            required
            autoFocus
            className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${firstNameError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            onChange={() => setFirstNameError(null)}
          />
          {firstNameError && (
            <p className="text-sm text-destructive" role="alert">
              {firstNameError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-[14px] font-semibold text-brand-primary">
            {t.onboarding.profileForm.surname}
          </Label>
          <Input
            id="lastName"
            name="lastName"
            placeholder="Ej. Pérez"
            required
            className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${lastNameError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            onChange={() => setLastNameError(null)}
          />
          {lastNameError && (
            <p className="text-sm text-destructive" role="alert">
              {lastNameError}
            </p>
          )}
        </div>

        {role === "provider" && (
          <CategorySelect
            categories={categories}
            error={categoryError}
            onChange={() => setCategoryError(null)}
          />
        )}

        <div className="pt-2">
          <Button
            variant="brand"
            size="full"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? t.onboarding.profileForm.saving : t.onboarding.profileForm.finishRegister}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
