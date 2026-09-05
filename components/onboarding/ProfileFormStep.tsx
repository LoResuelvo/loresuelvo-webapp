"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { Category } from "@/domain/shared/types";
import { CategorySelector } from "./CategorySelector";
import { CoverageZoneSelector } from "./CoverageZoneSelector";
import { AvatarUploader } from "./AvatarUploader";
import { useCoverageZones } from "./useCoverageZones";
import { t } from "@/infrastructure/i18n/translations";
import { validateProfileForm, validateProfilePhoto, ValidationErrors } from "@/domain/onboarding/validation";
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

function ProfileFormHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Button variant="ghost" type="button" onClick={onBack} className="mb-6 h-auto p-0 flex items-center text-sm font-semibold text-muted-foreground hover:text-brand-primary hover:bg-transparent transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t.onboarding.profileForm.back}
      </Button>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-title font-bold leading-tight tracking-tight text-brand-primary">{t.onboarding.profileForm.title}</h1>
        <p className="text-body-lg text-muted-foreground">{t.onboarding.profileForm.subtitle}</p>
      </div>
    </>
  );
}

function ProfileNameFields({
  firstNameError,
  lastNameError,
  onClearFirstName,
  onClearLastName,
}: {
  firstNameError: string | null;
  lastNameError: string | null;
  onClearFirstName: () => void;
  onClearLastName: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="firstName" className="text-body font-semibold text-brand-primary">{t.onboarding.profileForm.name}</Label>
        <Input
          id="firstName"
          name="firstName"
          placeholder="Ej. Juan"
          required
          autoFocus
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${firstNameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={onClearFirstName}
        />
        {firstNameError && <p className="text-sm text-destructive" role="alert">{firstNameError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName" className="text-body font-semibold text-brand-primary">{t.onboarding.profileForm.surname}</Label>
        <Input
          id="lastName"
          name="lastName"
          placeholder="Ej. Pérez"
          required
          className={`h-[46px] rounded-lg border-border bg-brand-neutral/30 text-body-lg placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-brand-primary ${lastNameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
          onChange={onClearLastName}
        />
        {lastNameError && <p className="text-sm text-destructive" role="alert">{lastNameError}</p>}
      </div>
    </>
  );
}

function ProfileFormSubmit({ isLoading, disabled }: { isLoading: boolean; disabled: boolean }) {
  return (
    <div className="pt-2">
      <Button variant="brand" size="full" type="submit" disabled={disabled}>
        {isLoading ? t.onboarding.profileForm.saving : t.onboarding.profileForm.finishRegister}
        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}

function useProfileFormValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validate = (formData: FormData, role: "consumer" | "provider" | null, zoneIds?: number[]) => {
    setErrors({});

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const categoryId = formData.get("categoryId") as string;
    const photo = (formData.get("profilePhoto") as File) || null;

    const { isValid, errors: validationErrors } = validateProfileForm(
      firstName,
      lastName,
      role,
      categoryId,
      photo?.size || 0,
      photo?.name || "",
      photo?.type || "",
      t.onboarding.profileForm,
      role === "provider" ? zoneIds : undefined
    );

    setErrors(validationErrors);
    return isValid;
  };

  const clearFieldError = (field: keyof ValidationErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return {
    firstNameError: errors.firstName || null,
    lastNameError: errors.lastName || null,
    categoryError: errors.categoryId || null,
    profilePhotoError: errors.profilePhoto || null,
    coverageZonesError: errors.coverageZones || null,
    setProfilePhotoError: (err: string | null) =>
      setErrors((prev) => ({ ...prev, profilePhoto: err || undefined })),
    clearFieldError,
    validate,
  };
}

function extractFormData(e: ChangeEvent<HTMLFormElement>, role: string | null, zoneIds: number[]) {
  const formData = new FormData(e.currentTarget);
  if (role === "provider") {
    formData.delete("coverageZoneIds");
    zoneIds.forEach((id) => formData.append("coverageZoneIds", id.toString()));
  }
  return formData;
}

function ProfileProviderFields({
  categories,
  categoryError,
  onClearCategoryError,
  coverage,
  coverageError,
  onToggleZone,
}: {
  categories: Category[];
  categoryError: string | null;
  onClearCategoryError: () => void;
  coverage: ReturnType<typeof useCoverageZones>;
  coverageError: string | null;
  onToggleZone: (zoneId: number) => void;
}) {
  return (
    <>
      <CategorySelector categories={categories} error={categoryError} onChange={onClearCategoryError} />
      <CoverageZoneSelector
        zones={coverage.zones}
        selectedZoneIds={coverage.selectedZoneIds}
        isLoading={coverage.isLoading}
        error={coverage.error}
        validationError={coverageError}
        onRetry={coverage.loadZones}
        onToggleZone={onToggleZone}
      />
    </>
  );
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
  const validation = useProfileFormValidation();
  const coverage = useCoverageZones(role);

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (role === "provider" && coverage.status === "empty") return;
    const formData = extractFormData(e, role, coverage.selectedZoneIds);
    if (validation.validate(formData, role, coverage.selectedZoneIds)) await onSubmit(formData);
  };

  const isSubmitDisabled = isLoading || (role === "provider" && coverage.status === "empty");

  return (
    <div className={cn("w-full", className)}>
      <ProfileFormHeader onBack={onBack} />
      {error && <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {(role === "provider" || role === "consumer") && (
          <AvatarUploader
            onPhotoSelected={(file) => validation.setProfilePhotoError(file ? validateProfilePhoto(file, t.onboarding.profileForm) : null)}
            error={validation.profilePhotoError}
          />
        )}
        <ProfileNameFields
          firstNameError={validation.firstNameError}
          lastNameError={validation.lastNameError}
          onClearFirstName={() => validation.clearFieldError("firstName")}
          onClearLastName={() => validation.clearFieldError("lastName")}
        />
        {role === "provider" && (
          <ProfileProviderFields
            categories={categories}
            categoryError={validation.categoryError}
            onClearCategoryError={() => validation.clearFieldError("categoryId")}
            coverage={coverage}
            coverageError={validation.coverageZonesError}
            onToggleZone={(zoneId) => {
              validation.clearFieldError("coverageZones");
              coverage.toggleZone(zoneId);
            }}
          />
        )}
        <ProfileFormSubmit isLoading={isLoading} disabled={isSubmitDisabled} />
      </form>
    </div>
  );
}
